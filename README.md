# graphql-json-schema
[![](https://travis-ci.org/jakubfiala/graphql-json-schema.svg?branch=master)](https://travis-ci.org/jakubfiala/graphql-json-schema)

Converts GraphQL Schema Language to JSON Schema

## Installation

```shell
npm install graphql-json-schema
```

## Usage

```js
  const transform = require('graphql-json-schema');

  // transform(schemaStr, strictMode=flase)
  //  - strict mode ensure a valid JSON schema generation

  const schema = transform(`
    scalar Foo

    union MyUnion = Foo | String | Float

    enum MyEnum {
      FIRST_ITEM
      SECOND_ITEM
      THIRD_ITEM
    }

    type Stuff {
      my_field: Int
      req_field: String!
      recursion: MoreStuff
      custom_scalar: Foo
      enum: MyEnum
    }

    type MoreStuff {
      first: [Float]
      identifier: [ID]!
      reference: Stuff!
      bool: Boolean!
      union: MyUnion
      with_params(param1: Int, param2: [Float]): Int
    }

    input InputType {
      an_int: Int!
      a_string: String
    }
  `);

  console.log(schema);
```

the code above prints the following JSON as a plain JS object:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "definitions": {
    "Foo": {
      "title": "Foo",
      "type": "GRAPHQL_SCALAR"
    },
    "MyUnion": {
      "title": "MyUnion",
      "type": "GRAPHQL_UNION",
      "oneOf": [
        {
          "$ref": "#/definitions/Foo"
        },
        {
          "type": "string",
          "required": false
        },
        {
          "type": "number",
          "required": false
        }
      ]
    },
    "MyEnum": {
      "title": "MyEnum",
      "type": "GRAPHQL_ENUM",
      "enum": [
        "FIRST_ITEM",
        "SECOND_ITEM",
        "THIRD_ITEM"
      ]
    },
    "Stuff": {
      "title": "Stuff",
      "type": "object",
      "properties": {
        "my_field": {
          "type": "integer",
          "required": false,
          "title": "my_field",
          "arguments": []
        },
        "req_field": {
          "type": "string",
          "required": true,
          "title": "req_field",
          "arguments": []
        },
        "recursion": {
          "allOf": [
            {
              "$ref": "#/definitions/MoreStuff"
            },
            {
              "title": "recursion"
            }
          ]
        },
        "custom_scalar": {
          "allOf": [
            {
              "$ref": "#/definitions/Foo"
            },
            {
              "title": "custom_scalar"
            }
          ]
        },
        "enum": {
          "allOf": [
            {
              "$ref": "#/definitions/MyEnum"
            },
            {
              "title": "enum"
            }
          ]
        }
      },
      "required": [
        "req_field"
      ]
    },
    "MoreStuff": {
      "title": "MoreStuff",
      "type": "object",
      "properties": {
        "first": {
          "type": "array",
          "items": {
            "type": {
              "type": "number",
              "required": false
            }
          },
          "title": "first",
          "arguments": []
        },
        "identifier": {
          "type": "array",
          "items": {
            "type": {
              "type": "string",
              "required": false
            }
          },
          "required": true,
          "title": "identifier",
          "arguments": []
        },
        "reference": {
          "allOf": [
            {
              "$ref": "#/definitions/Stuff",
              "required": true
            },
            {
              "title": "reference"
            }
          ]
        },
        "bool": {
          "type": "boolean",
          "required": true,
          "title": "bool",
          "arguments": []
        },
        "union": {
          "allOf": [
            {
              "$ref": "#/definitions/MyUnion"
            },
            {
              "title": "union"
            }
          ]
        },
        "with_params": {
          "type": "integer",
          "required": false,
          "title": "with_params",
          "arguments": [
            {
              "title": "param1",
              "type": {
                "type": "integer",
                "required": false
              },
              "defaultValue": null
            },
            {
              "title": "param2",
              "type": {
                "type": "array",
                "items": {
                  "type": {
                    "type": "number",
                    "required": false
                  }
                }
              },
              "defaultValue": null
            }
          ]
        }
      },
      "required": [
        "identifier",
        "bool"
      ]
    },
    "InputType": {
      "title": "InputType",
      "type": "object",
      "input": true,
      "properties": {
        "an_int": {
          "type": "integer",
          "required": true,
          "title": "an_int"
        },
        "a_string": {
          "type": "string",
          "required": false,
          "title": "a_string"
        }
      },
      "required": [
        "an_int"
      ]
    }
  }
}
```
