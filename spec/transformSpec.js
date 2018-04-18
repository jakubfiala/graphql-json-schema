const transform = require('../index.js');
const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');

const ajv = new Ajv();
const mockJSONSchema = require(path.join(__dirname, 'data/mock_schema.json'));
const mockJSONSchemaStrict = require(path.join(__dirname, 'data/mock_schema_strict.json'));
const mockGraphQL = fs.readFileSync(path.join(__dirname, 'data/mock_schema.graphql'), { encoding: 'utf-8' });

describe('GraphQL to JSON Schema transform', () => {
  it('fails if the schema is not a string', () => {
    expect(() => transform(Math.PI)).toThrowError();
  });

  it('fails if the schema is not a valid GraphQL schema', () => {
    expect(() => transform(`
      type MyBrokenType {
        semicolon: String;
      }
    `)).toThrowError();
  });

  it('parses a test GraphQL Schema properly', () => {
    expect(transform(mockGraphQL)).toEqual(mockJSONSchema);
  });

  it('return a valid JSON Schema definition', () => {
    const schema = transform(`
      type Stuff {
        my_field: Int
        req_field: String!
        recursion: MoreStuff
        custom_scalar: Foo
        enum: MyEnum
      }
    `);
    const valid = ajv.validateSchema(schema);
    expect(valid).toBe(true);
    if (!valid) {
      console.log(ajv.errors)
    }
  });

  describe('with strict mode', () => {
    it('parses a test GraphQL Schema properly', () => {
      const schema = transform(mockGraphQL, true);
      expect(schema).toEqual(mockJSONSchemaStrict);
      const valid = ajv.validateSchema(schema);
      expect(valid).toBe(true);
      if (!valid) {
        console.log(ajv.errors)
      }
    });
  })
})
