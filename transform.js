/**
 * Mapping between GQL primitive types and JSON Schema property types
 *
 * @type       {<type>}
 */
const PRIMITIVES = {
  Int: 'integer',
  Float: 'number',
  String: 'string',
  Boolean: 'boolean',
  ID: 'string'
};

/**
 * returns a JSON schema property type for a given GQL field type
 *
 * @param      {object}  type    The GQL type object
 * @return     {Object}  the property type object or a reference to a type definition
 */
const getPropertyType = type => {
  switch (type.kind) {
    case 'NonNullType':
      return Object.assign(getPropertyType(type.type), { required: true });
    case 'ListType':
      return {
        type: 'array',
        items: {
          type: getPropertyType(type.type)
        }
      }
    default:
      if (type.name.value in PRIMITIVES) {
        return {
          type: PRIMITIVES[type.name.value],
          required: false
        };
      }
      else {
        return { $ref: `#/definitions/${type.name.value}` };
      }
  }
}

/**
 * converts the GQL arguments array into a plain JSON schema array
 *
 * @param      {Array}  _arguments  The GQL arguments
 * @return     {Object}  a plain JSON array
 */
const toFieldArguments = _arguments => {
  return _arguments.map(a => {
    return {
      title: a.name.value,
      type: getPropertyType(a.type),
      defaultValue: a.defaultValue
    };
  });
}

/**
 * maps a GQL type field onto a JSON Schema property
 *
 * @param      {object}  field   The GQL field object
 * @return     {Object}  a plain JS object containing the property schema or a reference to another definition
 */
const toSchemaProperty = field => {
  let propertyType = getPropertyType(field.type);

  if ('$ref' in propertyType) propertyType = { allOf: [propertyType, { title: field.name.value }] };

  return Object.assign(
    propertyType,
    { title: field.name.value },
    field.arguments ? { arguments: toFieldArguments(field.arguments) } : {}
  );
}

/**
 * Converts a single GQL definition into a plain JS schema object
 *
 * @param      {Object}  definition  The GQL definition object
 * @return     {Object}  A plain JS schema object
 */
const toSchemaObject = definition => {
  if (definition.kind === 'ScalarTypeDefinition') {
    return {
      title: definition.name.value,
      type: 'GRAPHQL_SCALAR'
    }
  }
  else if (definition.kind === 'UnionTypeDefinition') {
    return {
      title: definition.name.value,
      type: 'GRAPHQL_UNION',
      oneOf: definition.types.map(getPropertyType)
    }
  }
  else if (definition.kind === 'EnumTypeDefinition') {
    return {
      title: definition.name.value,
      type: 'GRAPHQL_ENUM',
      enum: definition.values.map(v => v.name.value)
    };
  }

  const fields = definition.fields.map(toSchemaProperty);

  const properties = {};
  for (let f of fields) properties[f.title] = f.allOf ? { allOf: f.allOf } : f;

  const required = fields
    .filter(f => f.required)
    .map(f => f.title);

  let schemaObject = {
    title: definition.name.value,
    type: 'object',
    properties,
    required,
  };

  if (definition.kind === 'InputObjectTypeDefinition') {
    Object.assign(schemaObject, { input: true });
  }

  return schemaObject;
}

/**
 * GQL -> JSON Schema transform
 *
 * @param      {Document}  document  The GraphQL document returned by the parse function of graphql/language
 * @return     {object}  A plain JavaScript object which conforms to JSON Schema
 */
const transform = document => {
  const definitions = document.definitions.map(toSchemaObject);

  const schema = {
    $schema: 'http://json-schema.org/draft-04/schema#',
    definitions: {}
  };

  for (let def of definitions) {
    schema.definitions[def.title] = def;
  }

  return schema;
};

module.exports = transform;
