const http = require('node:http');

const PORT = Number(process.env.DORA_EXPORTER_PORT || 9101);
const REPOSITORY = process.env.GITHUB_REPOSITORY || '';
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const WORKFLOW_NAME = process.env.DORA_WORKFLOW_NAME || 'Backend CI/CD';
const WINDOW_DAYS = Number(process.env.DORA_WINDOW_DAYS || 7);

function renderMetric(name, help, type, samples) {
  return [
    `# HELP ${name} ${help}`,
    `# TYPE ${name} ${type}`,
    ...samples,
  ].join('\n');
}

function labelsToString(labels) {
  const entries = Object.entries(labels);
  if (entries.length === 0) return '';

  return `{${entries
    .map(([key, value]) => `${key}="${String(value).replace(/"/g, '\\"')}"`)
    .join(',')}}`;
}

function sample(name, value, labels = {}) {
  return `${name}${labelsToString(labels)} ${Number.isFinite(value) ? value : 0}`;
}

async function fetchWorkflowRuns() {
  if (!REPOSITORY) {
    return [];
  }

  const url = `https://api.github.com/repos/${REPOSITORY}/actions/runs?per_page=100`;
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'fshop-dora-exporter',
  };

  if (TOKEN) {
    headers.Authorization = `Bearer ${TOKEN}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`GitHub API returned ${response.status}`);
  }

  const data = await response.json();
  return (data.workflow_runs || []).filter(
    (run) => run.name === WORKFLOW_NAME || run.display_title === WORKFLOW_NAME,
  );
}

function calculateMetrics(runs) {
  const now = Date.now();
  const windowMs = WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const recentRuns = runs.filter(
    (run) => new Date(run.created_at).getTime() >= now - windowMs,
  );

  const successfulRuns = recentRuns.filter((run) => run.conclusion === 'success');
  const failedRuns = recentRuns.filter((run) =>
    ['failure', 'cancelled', 'timed_out'].includes(run.conclusion),
  );
  const completedRuns = recentRuns.filter((run) => run.conclusion);
  const latestSuccess = successfulRuns[0];
  const latestFailure = failedRuns[0];

  const latestLeadTimeSeconds = latestSuccess?.head_commit?.timestamp
    ? Math.max(
        0,
        (new Date(latestSuccess.updated_at).getTime() -
          new Date(latestSuccess.head_commit.timestamp).getTime()) /
          1000,
      )
    : 0;

  const latestRestoreSeconds =
    latestFailure && latestSuccess
      ? Math.max(
          0,
          (new Date(latestSuccess.updated_at).getTime() -
            new Date(latestFailure.updated_at).getTime()) /
            1000,
        )
      : 0;

  return {
    total: completedRuns.length,
    success: successfulRuns.length,
    failed: failedRuns.length,
    deploymentFrequencyDaily: successfulRuns.length / WINDOW_DAYS,
    changeFailureRate:
      completedRuns.length > 0 ? failedRuns.length / completedRuns.length : 0,
    latestLeadTimeSeconds,
    latestRestoreSeconds,
  };
}

async function metricsResponse() {
  const runs = await fetchWorkflowRuns();
  const metrics = calculateMetrics(runs);

  return [
    renderMetric('fshop_dora_workflow_runs_total', 'GitHub Actions workflow runs by conclusion', 'counter', [
      sample('fshop_dora_workflow_runs_total', metrics.success, { conclusion: 'success' }),
      sample('fshop_dora_workflow_runs_total', metrics.failed, { conclusion: 'failed' }),
      sample('fshop_dora_workflow_runs_total', metrics.total, { conclusion: 'completed' }),
    ]),
    renderMetric('fshop_dora_deployment_frequency_daily', `Successful workflow runs per day over ${WINDOW_DAYS} days`, 'gauge', [
      sample('fshop_dora_deployment_frequency_daily', metrics.deploymentFrequencyDaily),
    ]),
    renderMetric('fshop_dora_change_failure_rate', 'Failed workflow runs divided by completed workflow runs', 'gauge', [
      sample('fshop_dora_change_failure_rate', metrics.changeFailureRate),
    ]),
    renderMetric('fshop_dora_latest_lead_time_seconds', 'Latest successful workflow lead time from commit timestamp to completion', 'gauge', [
      sample('fshop_dora_latest_lead_time_seconds', metrics.latestLeadTimeSeconds),
    ]),
    renderMetric('fshop_dora_latest_restore_seconds', 'Time between latest failed workflow and latest successful workflow', 'gauge', [
      sample('fshop_dora_latest_restore_seconds', metrics.latestRestoreSeconds),
    ]),
  ].join('\n\n');
}

const server = http.createServer(async (req, res) => {
  if (req.url !== '/metrics') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  try {
    const body = await metricsResponse();
    res.writeHead(200, {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
    });
    res.end(`${body}\n`);
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end(`dora_exporter_error ${JSON.stringify(error.message)}\n`);
  }
});

server.listen(PORT, () => {
  console.log(`DORA exporter listening on :${PORT}/metrics`);
});
