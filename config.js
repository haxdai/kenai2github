let config = {};
config.github = {};
config.jira = {};

/** Does not really create issues in github */
config.simulate = false;

/** If true, creates a file (issues.json) with json data from issues in the same folder*/
config.writetofile = false;

/** Kenai Project name injected in JQL, i.e. SEMANTICWEBBUILDER */
config.jira.project = "MYPROJECT";

/** Kenai query URL, concatenates project name */
config.jira.url = `https://kenai.com/jira/sr/jira.issueviews:searchrequest-xml/temp/SearchRequest.xml?jqlQuery=project+%3D+${config.jira.project}&tempMax=9999`;

/** Github username, this user will be the creator of issues and comments */
config.github.user = 'foo';

/** Github user acces token */
config.github.token = 'myToken';

/** Github user repository owner, in case repo belongs to an orgnanization */
config.github.repoowner = 'foo';

/** Github repository name to cerate issues in. i.e. SemanticWebbuilder */
config.github.reponame = 'myRepo';

module.exports = config;
