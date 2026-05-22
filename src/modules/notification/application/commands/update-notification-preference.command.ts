import { ICommand } from 'src/libs/core/application';

export class PreferenceItem {
  constructor(
    public readonly type: string,
    public readonly channel: string,
    public readonly enabled: boolean,
  ) {}
}

export class UpdateNotificationPreferenceCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly preferences: PreferenceItem[],
  ) {}
}
