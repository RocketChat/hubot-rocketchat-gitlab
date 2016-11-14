hubot-gitlab-agile
==================

https://gitlab.sigmageosistemas.com.br/dev/hubot-gitlab-agile

## Objetive

Integrates with gitlab and generates some measures of progress.

## Requirements

* underscore
* gitlab-api

## Settings

* GITLAB_RECORD_LIMIT (default: 20);
* GITLAB_URL: required
* GITLAB_TOKEN: required

## Warning

Since this uses gitlab api, using a token, the same permissions are applied to the owner of that token.

And, since you can only specify a **single api token**, be careful
about what level of permissions you do publish.

## Commands available

### hubot gitlab search p <term>

Searches gitlab for a project with name term

### hubot gitlab search projects <term>

Searches gitlab for a project with name term

### hubot gitlab list projects [all]
### hubot gitlab list p [all]

List gitlab projects. Order is by usage of projects in gitlab.
If you specify the ```all``` modifier, it will list ALL of the projects.

It may take a while!

### hubot gitlab list milestones <project_id> [all|opened|closed]
### hubot gitlab list m <project_id> [all|opened|closed]

List milestones for a specific project. if you specify a modifier,
it will be applied.

**caveat**: opened and closed modifiers are not implemented yet.

### hubot gitlab list issues <project_id>
### hubot gitlab list i <project_id>

List the issues for a project.

### hubot gitlab progress <project_id> <milestone_id>

Generates a simple metric of progress by checking your gitlab opened and closed issues on that specific milestone.

You can specify a weight (effort, actually) for each issue. Inside
the description you can place

>
> $effort:x
>

Where x is an integer.

If specified, it will be taken into account. if not the default effort is 1.

This will tell you:

* total effort;
* open effort;
* closed effort;
* remaining effort;
* open percentage;
* closed percentage;

## Roadmap

* make it possible to open and close sprints;
* add measures with progress to sprints;
* generate burndown charts;

## How to contribute

* Automated tests;
* Tests;
* Ideas;
* Etc;
