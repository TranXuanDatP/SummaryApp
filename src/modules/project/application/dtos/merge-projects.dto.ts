import { IsArray, IsString, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MergeProjectsDto {
  @ApiProperty({
    example: ['uuid-1', 'uuid-2'],
    description: 'Source project IDs to merge',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Phải chọn ít nhất 1 dự án nguồn' })
  @IsString({ each: true })
  sourceIds: string[];
}
