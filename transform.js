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
      return getPropertyType(type.type);
    case 'ListType':
      return {
        type: 'array',
        items: getPropertyType(type.type)
      }
    default:
      if (type.name.value in PRIMITIVES) {
        return {
          type: PRIMITIVES[type.name.value]
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
const toSchemaProperty = (strictMode = false) => field => {
  let propertyType = getPropertyType(field.type);

  if ('$ref' in propertyType) propertyType = { allOf: [propertyType, { title: field.name.value }] };

  return Object.assign(
    propertyType,
    { title: field.name.value },
    field.arguments && !strictMode ? { arguments: toFieldArguments(field.arguments) } : {}
  );
}


const getRequiredFields = fields => fields
  .filter(f => f.type ? f.type.kind === 'NonNullType' : f.kind === 'NonNullType')
  .map(f => f.name.value);

/**
 * Converts a single GQL definition into a plain JS schema object
 *
 * @param      {Object}  definition  The GQL definition object
 * @return     {Object}  A plain JS schema object
 */
const toSchemaObject = (strictMode = false) => definition => {
  if (definition.kind === 'ScalarTypeDefinition') {
    return {
      title: definition.name.value,
      ...(strictMode ? {} : { type: 'GRAPHQL_SCALAR' })
    }
  }
  else if (definition.kind === 'UnionTypeDefinition') {
    return {
      title: definition.name.value,
      // type: 'GRAPHQL_UNION', // type is optional here
      oneOf: definition.types.map(getPropertyType)
    }
  }
  else if (definition.kind === 'EnumTypeDefinition') {
    return {
      title: definition.name.value,
      // type: 'GRAPHQL_ENUM', // type is optional here
      enum: definition.values.map(v => v.name.value)
    };
  }

  const required = getRequiredFields(definition.fields);

  const fields = definition.fields.map(toSchemaProperty(strictMode));

  const properties = {};
  for (let f of fields) properties[f.title] = f.allOf ? { allOf: f.allOf } : f;

  let schemaObject = {
    title: definition.name.value,
    type: 'object',
    properties,
    required,
  };

  if (!strictMode && definition.kind === 'InputObjectTypeDefinition') {
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

const transform = (document, strictMode = false) => {
  // ignore directives
  const definitions = document.definitions
    .filter(d => d.kind !== 'DirectiveDefinition')
    .map(toSchemaObject);

  const schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    definitions: {}
  };

  for (let def of definitions) {
    schema.definitions[def.title] = def;
  }

  return schema;
};

module.exports = transform;
