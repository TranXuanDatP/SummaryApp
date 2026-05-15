import { IsArray, IsString, ArrayMinSize } from 'class-validator';

export class MergeProjectsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Phải chọn ít nhất 1 dự án nguồn' })
  @IsString({ each: true })
  sourceIds: string[];
}
