import { IsString, Length } from 'class-validator';

export class AssignUserRoleDto {
  @IsString()
  @Length(1, 128)
  roleName!: string;
}
