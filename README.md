# kenai2github
Node app to migrate Kenai issues to github issues, using jira.issueviews:searchrequest-xml service. Inspired by [jira-to-github](https://github.com/eveoh/jira-to-github).

# Quick start

## Clone repo and install node dependencies
````sh
git clone https://github.com/haxdai/kenai2github.git
cd kenai2github
npm install
````

## Create github user token
Follow [instructions](https://help.github.com/articles/creating-an-access-token-for-command-line-use/) to create an access token.

## Change config.js
Edit config.js to change values according to your needs.

## Run the application

From the app folder run the following command.
````sh
node .
````
