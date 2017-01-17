let config = require("./config");
const https = require('https');
const xml2js = require('xml2js');
const jsonfile = require('jsonfile');
const GitHubApi = require("github");
let github = new GitHubApi();

function setProperty(source={}, dest={}, propName=undefined, options={underscore:false, asArray:false}) {
  if (!propName) return;
  let pName = options.newName ? options.newName : propName;
  if (source[propName] && source[propName].length) {
    let pVal = options.underscore ? source[propName][0]._ : source[propName][0];
    if (options.asArray) {
      dest[pName] = source[propName];;
    } else if (!options.filterValues || (options.filterValues && options.filterValues.length && !options.filterValues.includes(pVal))) {
      dest[pName] = pVal;
    }
  }
};

function setComments(source={}, dest={}) {
  let comments = [];
  if (source.comments && source.comments.length && source.comments[0].comment && source.comments[0].comment.length) {
    source.comments[0].comment.forEach((item) => {
      if (item.$) {
        let cmt = {};
        cmt.author = item.$.author;
        cmt.created = item.$.created
        if (item._ && item._.length) {
          cmt.body = item._;
        }
        comments.push(cmt);
      }
    });
  }

  if (comments.length) {
    dest.comments = comments;
  }
};

function getIssueLabels(issue) {
  let ret = [];
  issue.components && issue.components.forEach((component) => {
    ret.push("component:"+component);
  });

  issue.type && ret.push(issue.type);
  issue.priority && ret.push("priority:"+issue.priority);
  issue.resolution && ret.push("resolution:"+issue.resolution);
  issue.status && ret.push("status:"+issue.status);

  return ret;
};

function getIssueBody(issue) {
  let ret = "";

  if (issue.description && issue.description.length) {
    ret = issue.description+"\n\n";
  }

  if (issue.versions && issue.versions.length) {
    ret += "## Affects versions\n";
    issue.versions.forEach((version) => {
      ret = ret + "* " + version +"\n";
    });
    ret += "\n";
  }

  if (issue.fixVersions && issue.fixVersions.length) {
    ret += "## Fix versions\n";
    issue.fixVersions.forEach((version) => {
      ret = ret + "* " + version + "\n";
    });
    ret += "\n";
  }

  if (issue.environment && issue.environment.length) {
    ret += "## Environment\n" + issue.environment + "\n\n";
  }

  if (issue.metadata) {
    let meta = [], names = [], values = [];
    for (let p in issue.metadata) {
      if (issue.metadata.hasOwnProperty(p)) {
        meta.push({name:p, value:issue.metadata[p]});
      }
    }

    names = meta.map((item) => {
      return item.name;
    });

    values = meta.map((item) => {
      return item.value;
    });

    if (names.length) {
      ret+= "## Kenai Metadata\n\n";
      ret += "|" + names.join("|") + "|\n";

      for(let i = 0; i < names.length; i++) {
        ret += "|---";
      }

      ret+="|\n";

      for(let i = 0; i < names.length; i++) {
        if (names[i] === "link") {
          ret += "|["+values[i]+"]("+values[i]+")";
        } else {
          ret += "|" + values[i];
        }
      }
      ret+="|\n";

    }
  }

  return ret;
};

function getCommentBody(comment) {
  let ret = "";

  if (comment.body && comment.body.length) {
    ret = comment.body+"\n\n";
  }

  ret += "## Kenai Metadata\n\n|author|created|\n|---|---|\n";
  ret += "|"+comment.author+"|"+comment.created+"|";

  return ret;
};

function createIssueObject(jsonItem) {
  let issue = {};
  issue.metadata = {};

  //Get JIRA specific data
  setProperty(jsonItem, issue.metadata, "created");
  setProperty(jsonItem, issue.metadata, "updated");
  setProperty(jsonItem, issue.metadata, "reporter", {underscore:true});
  setProperty(jsonItem, issue.metadata, "assignee", {underscore:true});
  setProperty(jsonItem, issue.metadata, "due");
  setProperty(jsonItem, issue.metadata, "resolved");
  setProperty(jsonItem, issue.metadata, "link");

  //Get issue properties
  setProperty(jsonItem, issue, "summary", {newName:"title"});
  setProperty(jsonItem, issue, "description");
  setProperty(jsonItem, issue, "component", {newName:"components", asArray: true});
  setProperty(jsonItem, issue, "fixVersion", {newName:"fixVersions", asArray:true});
  setProperty(jsonItem, issue, "version", {newName:"versions", asArray:true});
  setProperty(jsonItem, issue, "priority", {underscore:true});
  setProperty(jsonItem, issue, "environment");
  setProperty(jsonItem, issue, "resolution", {underscore:true});
  setProperty(jsonItem, issue, "status", {underscore:true, filterValues: ["Open", "Closed", "Reopened"]});
  setProperty(jsonItem, issue, "type", {underscore:true});

  setComments(jsonItem, issue);

  return issue;
};

function createGithubIssue(issue, simulate=false) {
  if (simulate) {
    console.lg("Creating github issue "+issue.title);
    return;
  }
  github.issues.create({owner:config.github.repoowner, repo:config.github.reponame, title:issue.title, body: getIssueBody(issue), labels: getIssueLabels(issue)},
  function (err, res) {
    if (err) {
      console.log(err);
      return;
    }

    if (res && res.number) {
      let issueNo = res.number;
      issue.comments && issue.comments.forEach((comment) => {
        github.issues.createComment({owner:config.github.repoowner, repo:config.github.reponame, number:issueNo, body: getCommentBody(comment)},
        function(err, res) {
          if(err) console.log(err);
        });
      });
    }
  });
};

github.authenticate({
    type: "token",
    token: config.github.token
});

let parser = new xml2js.Parser();
let rawData = '';
https.get(config.jira.url, (res) => {
  res.on('data', (chunk) => rawData += chunk);
  res.on('end', () => {
    console.log("Processing issues...");
    parser.parseString(rawData, function (err, result) {
      if (err) {
        console.log("An error occurred...");
        console.log(err);
        return;
      }

      let issues = [];
      result.rss.channel[0].item.forEach((item, i) => {
          issues.push(createIssueObject(item));
      });

      if (config.writetofile) {
        jsonfile.writeFile("./issues.json", issues, function (err) {
          if (err) console.error(err);
        });
      }
      console.log(`Processed ${issues.length} issues.`);
      console.log("Creating issues in github repo...");
      issues.forEach((issue, i) => {
        createGithubIssue(issue, config.simulate);
      });
      console.log("Finished creating issues in github repo");
    });
  });

}).on('error', (e) => {
  console.error(e);
});
