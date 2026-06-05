import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from './entities/system-setting.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SystemSetting)
    private readonly settingsRepository: Repository<SystemSetting>,
  ) {}

  async findAll() {
    const defaults = [
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

    for (const def of defaults) {
      const exists = await this.settingsRepository.findOne({ where: { key: def.key } });
      if (!exists) {
        await this.settingsRepository.save(this.settingsRepository.create(def));
      }
    }

    return this.settingsRepository.find();
  }

  async updateMany(settings: Array<{ key: string; value: string }>) {
    const updated: SystemSetting[] = [];
    for (const item of settings) {
      let setting = await this.settingsRepository.findOne({
        where: { key: item.key },
      });
      if (setting) {
        setting.value = item.value;
      } else {
        setting = this.settingsRepository.create({
          key: item.key,
          value: item.value,
        });
      }
      updated.push(await this.settingsRepository.save(setting));
    }
    return updated;
  }

  async getVal(key: string, defaultValue: string): Promise<string> {
    const setting = await this.settingsRepository.findOne({ where: { key } });
    return setting ? setting.value : defaultValue;
  }
}
