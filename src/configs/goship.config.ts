export const GoshipConfig = {
  apiKey:
    process.env.GOSHIP_API_KEY ||
    'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjJiYjk4N2QzZWY3MTcwMzM3OTllZDM3NjczMjgwMTg1NDcxZjE2OTk1YjA4ZjJlYmIyYzY4MjBmMGU5OWExODE0NTJiOTU2ZWFkNWExNzA0In0.eyJhdWQiOiIxMyIsImp0aSI6IjJiYjk4N2QzZWY3MTcwMzM3OTllZDM3NjczMjgwMTg1NDcxZjE2OTk1YjA4ZjJlYmIyYzY4MjBmMGU5OWExODE0NTJiOTU2ZWFkNWExNzA0IiwiaWF0IjoxNzgwMTI0MjkxLCJuYmYiOjE3ODAxMjQyOTEsImV4cCI6MjA5NTc0MzQ5MSwic3ViIjoiNDExNCIsInNjb3BlcyI6W119.GVZoQsssB3-TBtwy1huLW708D53PE-yCCd5o79M2HC67Jo45ypWD3L-x8_ZDTAo9pXU_beGvW_3xixtHZoKr6jyxkTtcKTljyzTr5NmtpMPIreiRccizr4Fg6fsVN6m273uY73ei6xn5lFCAPiJ9K0uQml1q_XErXMTWiyNwwK-grBFQl01M6tlPtWZIdMpMAaQ4yNDGBCWKwfhLBgoBBOplh1pdwxoH9_SFtqGTB3SY3o6eCjAtVm-_1vqLc_NyLOJczNE3JK5wfh8FfJif9kaYMxLGShdLdjyQKsvGadjYnYWYRNONsSZJ_zeDbch_LcFxL40P0a1nhX5sP4PwgtgS7cb5KlxmMMDUWQjNUmOI6is-_pkQNn-xbxfUKuD4hHo4YQYQa1ob4OMxvs5IUE-spZPxg6q92obHXrnJ6n6iPpxoh077Bf-9n9V5e5nc2PHZypn3H33PyHKo3Ytc6vQG7uP2rmUIzGgSaT3HXmxzRX6Ebyd4TpiGJRqskkcB6t9S-cKXL_uUgw84wfua8XeSAn--YYOwOXcBlB6owLdeQq2a-WzTq5kVn1WxMvR8Lekl8oD4wLSYssTzdZYBvteYe_ysfS7DVV4Q4Cc1X8BB2zsYsD0S4PFFu6QNY7EQT2-gVVE4keS0YKot0UoD-eY8DIyarSV48Se9FVBvfWc',
  env: process.env.GOSHIP_ENV || 'sandbox',
  baseUrl: process.env.GOSHIP_BASE_URL || 'https://sandbox.goship.io/api/v2',
  webhookSecret:
    process.env.GOSHIP_WEBHOOK_SECRET ||
    'UJ0JyxdnEBhQKemO4CINZeuVcDe2FkBPu5Jy9JsH',
  autoCreate: true,
  shipper: {
    name: process.env.GOSHIP_SHIPPER_NAME || 'Nguyễn Đăng Phúc',
    phone: process.env.GOSHIP_SHIPPER_PHONE || '0838609516',
    street:
      process.env.GOSHIP_SHIPPER_STREET ||
      'Ktx Khu B ĐHQG, Đường Tiêu Biểu Số 3',
    city: process.env.GOSHIP_SHIPPER_CITY || '820000',
    district: process.env.GOSHIP_SHIPPER_DISTRICT || '820500',
    ward: process.env.GOSHIP_SHIPPER_WARD || '9777',
  },
  parcelDefaults: {
    weight: Number(process.env.GOSHIP_PARCEL_WEIGHT || 500),
    width: Number(process.env.GOSHIP_PARCEL_WIDTH || 10),
    height: Number(process.env.GOSHIP_PARCEL_HEIGHT || 10),
    length: Number(process.env.GOSHIP_PARCEL_LENGTH || 10),
  },
};

export default GoshipConfig;
