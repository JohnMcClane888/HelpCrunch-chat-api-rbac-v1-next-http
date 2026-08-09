import {
  IsString,
  MinLength,
} from 'class-validator';


export class UpdateConversationDto {

  @IsString()
  @MinLength(1)
  subject: string;

}