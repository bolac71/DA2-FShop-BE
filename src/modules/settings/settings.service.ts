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
