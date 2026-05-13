import { Test } from '@nestjs/testing';
import { COMMAND_BUS_TOKEN } from 'src/libs/core';
import { ConflictException } from 'src/libs/core/common';
import type { ICommandBus } from 'src/libs/core';
import { CreateUserCommand } from '../../application/commands';
import { SeedCommand } from './seed.command';

describe('SeedCommand', () => {
  let command: SeedCommand;
  let commandBus: jest.Mocked<ICommandBus>;
  let exitSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    commandBus = { execute: jest.fn() } as any;

    exitSpy = jest.spyOn(process, 'exit').mockImplementation((code?: number) => {
      throw new Error(`process.exit:${code}`);
    });
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    command = new SeedCommand(commandBus);
  });

  afterEach(() => {
    exitSpy.mockRestore();
    errorSpy.mockRestore();
    logSpy.mockRestore();
  });

  describe('successful user creation', () => {
    it('should dispatch CreateUserCommand and print user info', async () => {
      const userResult = {
        id: 'user-123',
        email: 'admin@test.com',
        fullName: 'Admin User',
        role: 'manager',
      };
      commandBus.execute.mockResolvedValue(userResult);

      await command.run([], {
        email: 'admin@test.com',
        password: 'Password1',
        fullName: 'Admin User',
        role: 'manager',
      });

      expect(commandBus.execute).toHaveBeenCalledTimes(1);
      expect(commandBus.execute).toHaveBeenCalledWith(
        new CreateUserCommand('admin@test.com', 'Password1', 'Admin User', 'manager'),
      );
      expect(logSpy).toHaveBeenCalledWith('✅ User created successfully:');
      expect(logSpy).toHaveBeenCalledWith('   id:       user-123');
    });

    it('should default role to manager when not specified', async () => {
      commandBus.execute.mockResolvedValue({
        id: 'user-456',
        email: 'a@b.c',
        fullName: 'Test',
        role: 'manager',
      });

      await command.run([], {
        email: 'a@b.c',
        password: 'Password1',
        fullName: 'Test',
      });

      expect(commandBus.execute).toHaveBeenCalledWith(
        new CreateUserCommand('a@b.c', 'Password1', 'Test', 'manager'),
      );
    });

    it('should support employee role', async () => {
      commandBus.execute.mockResolvedValue({
        id: 'emp-1',
        email: 'emp@test.com',
        fullName: 'Employee',
        role: 'employee',
      });

      await command.run([], {
        email: 'emp@test.com',
        password: 'Password1',
        fullName: 'Employee',
        role: 'employee',
      });

      expect(commandBus.execute).toHaveBeenCalledWith(
        new CreateUserCommand('emp@test.com', 'Password1', 'Employee', 'employee'),
      );
    });

    it('should NOT log the password', async () => {
      commandBus.execute.mockResolvedValue({
        id: 'user-1',
        email: 'a@b.c',
        fullName: 'Test',
        role: 'manager',
      });

      await command.run([], {
        email: 'a@b.c',
        password: 'SecretPass123',
        fullName: 'Test',
      });

      const allOutput = [
        ...logSpy.mock.calls.flat(),
        ...errorSpy.mock.calls.flat(),
      ].join(' ');
      expect(allOutput).not.toContain('SecretPass123');
    });
  });

  describe('missing required arguments', () => {
    it('should exit(1) when email is missing', async () => {
      await expect(
        command.run([], { password: 'pass', fullName: 'Test' }),
      ).rejects.toThrow('process.exit:1');

      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Missing required arguments'),
      );
    });

    it('should exit(1) when password is missing', async () => {
      await expect(
        command.run([], { email: 'a@b.c', fullName: 'Test' }),
      ).rejects.toThrow('process.exit:1');

      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should exit(1) when fullName is missing', async () => {
      await expect(
        command.run([], { email: 'a@b.c', password: 'pass' }),
      ).rejects.toThrow('process.exit:1');

      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should exit(1) when all options are missing', async () => {
      await expect(command.run([], {})).rejects.toThrow('process.exit:1');

      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should print usage instructions on missing args', async () => {
      await expect(command.run([], {})).rejects.toThrow('process.exit:1');

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('--email'));
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('--password'));
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('--fullName'));
    });
  });

  describe('duplicate email handling', () => {
    it('should exit(1) with friendly message on ConflictException', async () => {
      commandBus.execute.mockRejectedValue(
        ConflictException.duplicate('User', 'email', 'admin@test.com'),
      );

      await expect(
        command.run([], {
          email: 'admin@test.com',
          password: 'Password1',
          fullName: 'Admin',
        }),
      ).rejects.toThrow('process.exit:1');

      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('already exists'),
      );
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('admin@test.com'),
      );
    });
  });

  describe('unexpected errors', () => {
    it('should exit(1) with error message on other exceptions', async () => {
      commandBus.execute.mockRejectedValue(new Error('DB connection failed'));

      await expect(
        command.run([], {
          email: 'a@b.c',
          password: 'Password1',
          fullName: 'Test',
        }),
      ).rejects.toThrow('process.exit:1');

      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create user'),
        'DB connection failed',
      );
    });
  });
});
