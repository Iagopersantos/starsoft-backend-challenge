import { applyDecorators, Type } from '@nestjs/common';
import { ApiResponse, getSchemaPath } from '@nestjs/swagger';

interface ApiResponseOptions {
  description: string;
  type?: Type<unknown>;
  schema?: any;
}

export function ApiResponses(responses: { [key: number]: ApiResponseOptions }) {
  return applyDecorators(
    ...Object.entries(responses).map(
      ([status, { description, type, schema }]) => {
        if (type) {
          return ApiResponse({
            status: Number(status),
            description,
            schema: { $ref: getSchemaPath(type) },
          });
        }
        return ApiResponse({ status: Number(status), description, schema });
      },
    ),
  );
}
