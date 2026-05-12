import { Module } from '@nestjs/common';
import { SharedCqrsModule } from 'src/libs/shared';

/**
 * User Module
 *
 * Feature module implementing DDD/CQRS pattern for user management.
 *
 * Architecture:
 * - Domain: Entities, Value Objects, Domain Events
 * - Application: Commands, Queries, Handlers, DTOs (Story 1.2)
 * - Infrastructure: Repository, Read DAO, Controller (Story 1.2)
 */
@Module({
  imports: [SharedCqrsModule],
  providers: [],
  exports: [],
})
export class UserModule {}
