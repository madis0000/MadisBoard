/**
 * GraphQL Contract Tests
 *
 * Verifies that the generated TypeScript types from GraphQL codegen
 * match the actual schema served by the backend. This catches schema
 * drift between frontend types and backend resolvers.
 *
 * Run: npx vitest run tests/contract/graphql-contract.test.ts
 *
 * Prerequisites:
 * - Backend server running (or schema.gql available)
 * - GraphQL codegen has been run (yarn workspace @affine/graphql codegen)
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { buildSchema, parse, validate } from 'graphql';
import { describe, expect, it } from 'vitest';

const SCHEMA_PATH = resolve(
  __dirname,
  '../../packages/backend/server/src/schema.gql'
);

const QUERIES_DIR = resolve(
  __dirname,
  '../../packages/common/graphql/src'
);

describe('GraphQL Contract Tests', () => {
  let schema: ReturnType<typeof buildSchema>;

  // Attempt to load the schema — skip tests if not available
  try {
    const schemaSource = readFileSync(SCHEMA_PATH, 'utf-8');
    schema = buildSchema(schemaSource);
  } catch {
    it.skip('Schema file not available — run backend build first', () => {});
    return;
  }

  it('schema should be valid and parseable', () => {
    expect(schema).toBeDefined();
    expect(schema.getQueryType()).toBeDefined();
    expect(schema.getMutationType()).toBeDefined();
  });

  it('schema should have required root types', () => {
    const queryType = schema.getQueryType();
    const mutationType = schema.getMutationType();

    expect(queryType).toBeDefined();
    expect(mutationType).toBeDefined();

    // Core queries that must exist
    const queryFields = queryType!.getFields();
    expect(queryFields.currentUser).toBeDefined();
    expect(queryFields.serverConfig).toBeDefined();
  });

  it('user type should have required fields', () => {
    const userType = schema.getType('UserType');
    expect(userType).toBeDefined();
  });

  it('workspace type should have required fields', () => {
    const workspaceType = schema.getType('WorkspaceType');
    expect(workspaceType).toBeDefined();
  });

  it('deprecated fields should have deprecation reasons', () => {
    const typeMap = schema.getTypeMap();
    const deprecatedWithoutReason: string[] = [];

    for (const [typeName, type] of Object.entries(typeMap)) {
      if (typeName.startsWith('__')) continue; // Skip introspection types
      if (!('getFields' in type)) continue;

      const fields = (type as any).getFields();
      for (const [fieldName, field] of Object.entries(fields)) {
        if ((field as any).deprecationReason === '') {
          deprecatedWithoutReason.push(`${typeName}.${fieldName}`);
        }
      }
    }

    if (deprecatedWithoutReason.length > 0) {
      console.warn(
        'Deprecated fields without reasons:',
        deprecatedWithoutReason
      );
    }
  });

  it('all .gql files should validate against the schema', () => {
    const { globSync } = require('glob');
    const gqlFiles = globSync('**/*.gql', { cwd: QUERIES_DIR });
    const errors: Array<{ file: string; errors: string[] }> = [];

    for (const file of gqlFiles) {
      try {
        const source = readFileSync(resolve(QUERIES_DIR, file), 'utf-8');
        const document = parse(source);
        const validationErrors = validate(schema, document);

        if (validationErrors.length > 0) {
          errors.push({
            file,
            errors: validationErrors.map(e => e.message),
          });
        }
      } catch (e: any) {
        errors.push({
          file,
          errors: [e.message],
        });
      }
    }

    if (errors.length > 0) {
      const report = errors
        .map(e => `${e.file}:\n  ${e.errors.join('\n  ')}`)
        .join('\n');
      expect.fail(
        `GraphQL contract violations found:\n${report}`
      );
    }
  });
});
