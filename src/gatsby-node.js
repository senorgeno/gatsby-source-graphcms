import {GraphQLClient} from 'graphql-request';
import {forEachObjIndexed} from 'ramda';
import {createNodes} from './util';
import {DEBUG_MODE} from './constants';
import {
  keywordsError,
  checkForFaultyFields
} from './faulty-keywords';

exports.sourceNodes = async (
  {boundActionCreators, reporter},
  {endpoint, token, query, origin}
) => {
  if (query) {
    const {createNode} = boundActionCreators;

    const clientOptions = {
      headers: {
        Origin: origin ? origin : '',
        Authorization: token ? `Bearer ${token}` : undefined
      }
    };

    const client = new GraphQLClient(endpoint, clientOptions);

    const userQueryResult = await client.request(query);

    // Keywords workaround
    if (checkForFaultyFields(userQueryResult)) {
      reporter.panic(`gatsby-source-graphcms: ${keywordsError}`);
    }

    if (DEBUG_MODE) {
      const jsonUserQueryResult = JSON.stringify(userQueryResult, undefined, 2);
      console.log(`\ngatsby-source-graphcms: GraphQL query results: ${jsonUserQueryResult}`);
    }
    forEachObjIndexed(createNodes(createNode, reporter), userQueryResult);
  } else {
    reporter.panic(`gatsby-source-graphcms: you need to provide a GraphQL query in the plugin 'query' parameter`);
  }
};
