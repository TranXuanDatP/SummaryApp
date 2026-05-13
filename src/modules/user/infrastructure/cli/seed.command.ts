import { Inject } from '@nestjs/common';
import { Command, CommandRunner, Option } from 'nest-commander';
import { type ICommandBus, COMMAND_BUS_TOKEN } from 'src/libs/core';
import { ConflictException } from 'src/libs/core/common';
import { CreateUserCommand } from '../../application/commands';

export interface SeedUserOptions {
  email?: string;
  password?: string;
  fullName?: string;
  role?: string;
}

@Command({ name: 'seed:user', description: 'Create an initial user' })
export class SeedCommand extends CommandRunner {
  constructor(
    @Inject(COMMAND_BUS_TOKEN) private readonly commandBus: ICommandBus,
  ) {
    super();
  }

  async run(_passedParams: string[], options: SeedUserOptions): Promise<void> {
    const email = options.email;
    const password = options.password;
    const fullName = options.fullName;
    const role = options.role || 'manager';

    if (!email || !password || !fullName) {
      console.error('❌ Missing required arguments.\n');
      console.error(
        'Usage: nest command seed:user -e <email> -p <password> -n <fullName> [-r <role>]\n',
      );
      console.error('Options:');
      console.error('  -e, --email <email>       User email (required)');
      console.error(
        '  -p, --password <password> User password, min 8 chars (required)',
      );
      console.error('  -n, --fullName <name>     Full name (required)');
      console.error(
        '  -r, --role <role>         Role: employee|manager (default: manager)',
      );
      process.exit(1);
    }

    try {
      const result = await this.commandBus.execute<
        CreateUserCommand,
        { id: string; email: string; fullName: string; role: string }
      >(new CreateUserCommand(email, password, fullName, role));

      console.log('✅ User created successfully:');
      console.log(`   id:       ${result.id}`);
      console.log(`   email:    ${result.email}`);
      console.log(`   fullName: ${result.fullName}`);
      console.log(`   role:     ${result.role}`);
    } catch (error) {
      if (error instanceof ConflictException) {
        console.error(`❌ User with email "${email}" already exists.`);
        process.exit(1);
      }
      console.error(
        '❌ Failed to create user:',
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  }

  @Option({
    flags: '-e, --email <email>',
    description: 'User email (required)',
  })
  parseEmail(val: string): string {
    return val;
  }

  @Option({
    flags: '-p, --password <password>',
    description: 'User password (required)',
  })
  parsePassword(val: string): string {
    return val;
  }

  @Option({
    flags: '-n, --fullName <name>',
    description: 'Full name (required)',
  })
  parseFullName(val: string): string {
    return val;
  }

  private static readonly VALID_ROLES = ['employee', 'manager'];

  @Option({
    flags: '-r, --role <role>',
    description: 'Role: employee|manager',
    defaultValue: 'manager',
  })
  parseRole(val: string): string {
    if (!SeedCommand.VALID_ROLES.includes(val)) {
      console.error(
        `❌ Invalid role: "${val}". Must be one of: ${SeedCommand.VALID_ROLES.join(', ')}`,
      );
      process.exit(1);
    }
    return val;
  }
}
