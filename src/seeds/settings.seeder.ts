import { DataSource } from 'typeorm';
import { SystemSetting } from '../modules/settings/entities/system-setting.entity';

export async function seedSettings(dataSource: DataSource): Promise<void> {
  const repository = dataSource.getRepository(SystemSetting);

  const existingCount = await repository.count();
  if (existingCount > 0) {
    console.log('⚠️  System settings already exist, skipping seed');
    return;
  }



  const settings = [
    {
      key: 'DASHBOARD_URGENT_HIGH_THRESHOLD',
      value: '180',
      description: 'Số phút tối thiểu để đơn hàng được coi là Khẩn cấp (High priority - Màu đỏ)',
    },
    {
      key: 'DASHBOARD_URGENT_MEDIUM_THRESHOLD',
      value: '60',
      description: 'Số phút tối thiểu để đơn hàng được coi là Cần ưu tiên (Medium priority - Màu cam)',
    },
    {
      key: 'STOCK_LOW_THRESHOLD',
      value: '10',
      description: 'Ngưỡng cảnh báo tồn kho thấp (Low stock threshold)',
    },
  ];

  await repository.save(settings);
  console.log(`✅ Seeded ${settings.length} system settings`);
}
