# hubot-rocketchat-gitlab

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


### hubot s|erver set <gitlab_url> <token>

It sets the URL and TOKEN for the bot to use in the channel.

### hubot s|ecurity role <role>

Blocks the access to the bot functions on the channel based on Rocket.Chat roles.

### hubot p|roject list

List gitlab's projects. Order is by usage of projects in gitlab.

It may take a while to return the response!

### hubot p|roject set <project ID>

Sets the default project for working on it.

### hubot p|roject search <term>

Searches gitlab for a project with name term

### hubot m|ilestones list [all|opened|closed]

List milestones for a specific project. if you specify a modifier,
it will be applied.

### hubot i|ssue list <all|opened|closed>

Lists issues related to the default project.

### hubot i|ssue create <title>\n<body>

Create issues

### hubot i|ssue assign <issue_id> <username>

Assign issues to users

### hubot i|ssue <close|reopen|remove> <issue_id>

Close, reopen and remove issues

### hubot u|ser list

Lists users, if the token have this permittion

### hubot m|ilestone list <all|opened|closed>?

Lists milestones

### hubot b|uild list <created|pending|running|failed|success|canceled|skipped>?

Lists builds

### hubot b|uild play <build_id>

Make it able to play a pending or canceled build.

### hubot b|uild retry <build_id>

Rebuilds it

### hubot b|uild erase <build_id>

Erases the build

### hubot pi|peline list

Lists pipelines

### hubot d|eployment list

List deployments

## Thanks to
https://gitlab.sigmageosistemas.com.br/dev/hubot-gitlab-agile
Thanks to George Rodrigues da Cunha Silva
