export const GoshipConfig = {
  apiKey:
    process.env.GOSHIP_API_KEY ||
    'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6ImYwMzViNjQyZmY2ODY4NDlhYzc3MWRhOWMwYTlmZmM2ZDNmNTE5MThmMjI1NTZhZTJlYTc4YTNlMDBhN2ZhZWNiZmI3MmEwZDc4NWQyZmZjIn0.eyJhdWQiOiIxMyIsImp0aSI6ImYwMzViNjQyZmY2ODY4NDlhYzc3MWRhOWMwYTlmZmM2ZDNmNTE5MThmMjI1NTZhZTJlYTc4YTNlMDBhN2ZhZWNiZmI3MmEwZDc4NWQyZmZjIiwiaWF0IjoxNzgwMDQ1MzUzLCJuYmYiOjE3ODAwNDUzNTMsImV4cCI6MjA5NTY2NDU1Mywic3ViIjoiNDEwNCIsInNjb3BlcyI6W119.jG8IqldoJkTC3aSnm4uOCxUxNYr07_W8814W-oegSis_oPcdmK7fPxnBkPeunFKk0GgbqsjY4J_kZ7SWNEeGu1ugwFtmZAxUsMMOL3jbNVsZHNM8blfUWanqVN-LnYX_J7jflyJoCVw_qSP-mf60f5xjYCw6UVpW5SCyRkmLr9qwe84yW9TxQ2dXGZdZ8IQYlEhTX5WbimI9RTmohQ7dom4ztxobZKjXZAXjNmKxh6UHetyNSO244cvUT2zoQDclqxfFlHIU1qjDm6tV-7tz-MHVn7J0eWoofi83V3iAay69Ot-lJeh_4BLKoGUgGeg8OfmQDf4vmj_uKqT8vHJ8cH6e_KsnjBT1z7nyC8eM7yUlG_ROhJav1gBrrAjNcNYvmcbAaaxYqytUbBjadgkXEBQEGQK3F-_Vj25JyYQxpeqhbEQ54t177Tpeqi2vwda5meqGUpjJc_0CxHR2PRwE2KFQcoLBzsdnm1hIdQtrLqVXFm8SVzG3XyvUEDb26Kf4wmEpJ-f827qHo5k7kz305VRcRiEcO8GrcP-gjIVeT3nV8IuANfnBRc8fWyAiW6uIRFlH3Q6MVcZUkfOEFvBlY_QS-hMmizICQ7i3KzuiIPdN8OPiAUt6nJkIF6iNAsgB1j6nD4uNFSMI3FAoh5YTUo3W28t7pLmmH08-e86m8CI',
  env: process.env.GOSHIP_ENV || 'sandbox',
  baseUrl: process.env.GOSHIP_BASE_URL || 'https://sandbox.goship.io/api/v2',
  webhookSecret:
    process.env.GOSHIP_WEBHOOK_SECRET ||
    'bDDzyocVK3hdFST0hi4KeIDaCidnXmOvsC2zub3T',
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
