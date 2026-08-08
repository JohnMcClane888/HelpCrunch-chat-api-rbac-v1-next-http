import {
  ArrayUnique,
  IsArray,
  IsString,
  Length,
} from 'class-validator';

export class ReplaceRolePermissionsDto {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @Length(1, 128, { each: true })
  permissionNames!: string[];
}
