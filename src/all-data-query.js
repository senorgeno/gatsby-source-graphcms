/* 
  1. TODO: stop the infinite recursion
  2. Use a pluralization library 
     this is the one used by graph.cool (https://github.com/atteo/evo-inflector)
  3. Fix pagination limit
 */
const R = require('ramda')
const { GraphQLClient } = require('graphql-request')

const endpoint = `https://api.graphcms.com/simple/v1/vinylbase`
const client = new GraphQLClient(endpoint)

const introspectionQuery = `query LearnAboutProject {
  __schema {
    queryType {
      fields {
        name
      }
    }
    types {
      name
      fields {
        name
        type {
          kind
          name
          ofType {
            name
            ofType {
              name
            }
          }
        }
      }
    }
  }
}`

const getAllData = async query => {
  const {
    __schema: {
      queryType: {
        fields
      },
      types
    }
  } = await client.request(query)

  // Get the names that we'll use to filter our types: Artist, Track etc.
  const fieldNames = fields
    .filter(field => field.name.match(`^((?![all|_all])(?!node))`))
    .map(filteredField => filteredField.name)

  // Filter the types,
  // { name: `Track`, fields: [ { name: 'id', kind: 'ID' }, ... ] }
  const filteredTypes = types
    .filter(type => fieldNames.includes(type.name))

  // If type ends in a non-vowel, we need to append es. Else s.
  const formatTypeName = t => `all${t}s`

  const surroundWithBraces = c => `{${c}}`

  const aliasLengthTypeName = name =>
    name === 'length'
    ? 'aliasedLength: length'
    : name

  const filterTypesByName = name => type => type.name === name

  const nestFields = (name, typeName) => {
    const filtered = R.filter(filterTypesByName(typeName), filteredTypes)
    return `${name} {
      ${R.map(constructQueryBody, filtered)}
    }`
  }

  const getSubfields = ({ type, name }) => {
    if (type.kind === 'OBJECT') {
      return nestFields(name, type.name)
    }
    if (type.kind === 'LIST') {
      return nestFields(name, type.ofType.ofType.name)
    }
    return name
  }

  // Create the query body
  const constructQueryBody = type => {
    return `${R.compose(
      R.join(`\n`),
      R.map(aliasLengthTypeName),
      R.map(getSubfields)
    )(type.fields)}`
  }

  // Constructs a query for a given type.
  const constructTypeQuery = type => `
    ${formatTypeName(type.name)} {
      ${constructQueryBody(type)}
    }
  `

  // Composition which assembles the query to fetch all data.
  const assembleQueries = R.compose(
    surroundWithBraces,
    R.join(`\n`),
    R.map(constructTypeQuery)
  )
  assembleQueries(filteredTypes)
}

getAllData(introspectionQuery)
