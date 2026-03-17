import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsOptional, IsString, MaxLength } from 'class-validator';
import { StringOptional } from 'src/decorators/dto.decorator';

const parseHashtags = (value: unknown): unknown => {
	if (value === undefined || value === null || value === '') {
		return [];
	}

	if (Array.isArray(value)) {
		return value;
	}

	if (typeof value === 'string') {
		const trimmed = value.trim();

		if (!trimmed) {
			return [];
		}

		if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
			try {
				const parsed = JSON.parse(trimmed) as unknown;
				return Array.isArray(parsed) ? parsed : [trimmed];
			} catch {
				return [trimmed];
			}
		}

		return [trimmed];
	}

	return value;
};

export class CreatePostImageDto {
	@IsOptional()
	@ApiProperty({ type: 'string', format: 'binary', required: false })
	file?: any;
}

export class CreatePostDto {
	@StringOptional()
	@ApiProperty({ example: 'First fit-check post!', required: false })
	@MaxLength(5000, { message: 'Content must be at most 5000 characters' })
	content?: string;

	@IsOptional()
	@ApiProperty({
		description: 'Post images (upload multiple files)',
		type: 'array',
		items: { type: 'string', format: 'binary' },
		required: false,
	})
	postImages?: Express.Multer.File[];

	@IsOptional()
	@Transform(({ value }) => parseHashtags(value))
	@IsArray({ message: 'Hashtags must be an array' })
	@ArrayMaxSize(30, { message: 'A post can contain at most 30 hashtags' })
	@ArrayUnique({ message: 'Hashtags must be unique' })
	@IsString({ each: true, message: 'Each hashtag must be a string' })
	@MaxLength(100, { each: true, message: 'Each hashtag must be at most 100 characters' })
	@ApiProperty({
		required: false,
		type: [String],
		description:
			'Hashtags for the post. Accepts string array or JSON array string like ["summer","ootd"].',
		example: ['summer', 'ootd'],
	})
	hashtags?: string[];
}
