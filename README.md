# hubot-rocketchat-gitlab
==================

## Objetive

Integrates Rocket.Chat with Gitlab instances

## Requirements

* underscore
* gitlab
* hubot-rocketchat

## Settings

* GITLAB_RECORD_LIMIT (default: 20);
* GITLAB_URL: required (default: https://gitlab.com)
* GITLAB_TOKEN: required

## Warning

Since this uses gitlab api, using a token, the same permissions are applied to the owner of that token.

The tokens can be specified by channel, or even by direct message, using `access config <token> <gitlab url>` command.

## Commands available

commands will have full syntax and small syntax, to those who want to be more agile. Small syntax consists generally in using the first letter of the command with it's parameters.

### hubot a|access config <token> <gitlab_url>

It sets the URL and TOKEN for the bot to use in the channel.

### hubot p|project list

List gitlab's projects. Order is by usage of projects in gitlab.

It may take a while to return the response!

### hubot p|project set <project ID>

Sets the default project for working on it.

### hubot p|project search <term>

Searches gitlab for a project with name term

### hubot m|milestones list [all|opened|closed]

List milestones for a specific project. if you specify a modifier,
it will be applied.

### hubot i|issue list <all|opened|closed>

Lists issues related to the default project.

### hubot i|issue create <title>\n<body>

Create issues

### hubot i|issue assign <issue_id> <username>

Assign issues to users

### hubot i|issue <close|reopen|remove> <issue_id>

Close, reopen and remove issues

### hubot u|user list

Lists users, if the token have this permittion

### hubot m|milestone list <all|opened|closed>?

Lists milestones

### hubot b|build list <created|pending|running|failed|success|canceled|skipped>?

Lists builds

### hubot b|build play <build_id>

Make it able to play a pending or canceled build.

### hubot b|build retry <build_id>

Rebuilds it

### hubot b|build erase <build_id>

Erases the build

### hubot pi|pipeline list

Lists pipelines

### hubot d|deployment list

List deployments

## Forked from
https://gitlab.sigmageosistemas.com.br/dev/hubot-gitlab-agile
Thanks to George Rodrigues da Cunha Silva
