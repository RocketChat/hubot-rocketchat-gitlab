// Description:
//   Create and mark tasks to do, done, etc.
// Commands:
//   hubot p|project search <term>
//   hubot p|project list
//   hubot p|project set <project_id>
//   hubot m|milestone list <project_id>
//   hubot i|issues list <project_id>

// Dependencies:
//   hubot-redis-brain node-gitlab
/*jslint node: true*/

module.exports = function(robot) {
	// var GITLAB_RECORD_LIMIT = process.env.GITLAB_RECORD_LIMIT || 20;
	var GITLAB_URL = process.env.GITLAB_URL;
	var GITLAB_TOKEN = process.env.GITLAB_TOKEN;

	var gitlab = require('gitlab')({
		url: GITLAB_URL,
		token: GITLAB_TOKEN
	});

	var _ = require('underscore');
	var help = {};

	robot.brain.on('loaded', function() {

	});

	function describe(command, description) {
		help[command] = description;
	}

	function limitResult(res, result) {
		if (res.params.limit > 0) {
			return result.slice(0, res.params.limit);
		}
		return result;
	}

	function extractParams(res, params) {
		params = params.replace(/\s+/g, '').split(',');

		var defaultParams = {
			'project': function() {
				return robot.brain.get('gitlab_project_by_room_'+res.envelope.room);
			}
		};

		for (var i = 0; i < params.length; i++) {
			var param = params[i];
			res.params[param] = res.match[i+1];

			if (!res.params[param] && defaultParams[param]) {
				res.params[param] = typeof defaultParams[param] === 'function' ? defaultParams[param]() : defaultParams[param];
			}
		}

		// console.log('Params:', JSON.stringify(res.params, null, 2));
	}

	function getSetProjectMessage() {
		var robot_name = robot.alias || robot.name;
		return `Use \`${robot_name} project set #PROJECT_ID\` to set default project`;
	}

	// Renders
	function renderProjects(res, msg, records) {
		var found = false;
		_.forEach(limitResult(res, records), function(item) {
			msg += `\n[#${item.id} - ${item.path_with_namespace}](${item.web_url})`;

			if (String(item.id) === String(res.params.project)) {
				found = true;
				msg += ' - **default**';
			}
		});

		if (found === false) {
			msg += '\n\n'+getSetProjectMessage();
		}

		return msg;
	}

	function renderUsers(res, msg, records) {
		var found = false;
		_.forEach(limitResult(res, records), function(item) {
			msg += `\n[#${item.id} - ${item.username} - ${item.name}](${item.web_url})`;
		});

		return msg;
	}

	function renderMilestones(res, msg, records) {
		_.forEach(limitResult(res, records), function(item) {
			msg += `\n#${item.iid} - ${item.title}`;
			if (item.state === 'closed') {
				msg += ' **CLOSED**';
			}
		});

		return msg;
	}

	function renderIssues(res, msg, records) {
		_.forEach(limitResult(res, records), function(item) {
			msg += `\n[#${item.iid} - ${item.title}](${item.web_url})`;
			if (item.state === 'closed') {
				msg += ' **CLOSED**';
			}
		});

		return msg;
	}

	function renderPipelines(res, msg, records) {
		_.forEach(limitResult(res, records), function(item) {
			msg += `\n#${item.id} - ${item.ref} - **${item.status}**`;
		});

		return msg;
	}

	function renderBuilds(res, msg, records) {
		_.forEach(limitResult(res, records), function(item) {
			msg += `\n#${item.id} - ${item.name} (stage: ${item.stage}, branch: ${item.ref}) - **${item.status}**`;
		});

		return msg;
	}

	robot.listenerMiddleware(function(context, next, done) {
		context.response.params = context.response.params || {};

		if (!context.listener.options) {
			return next();
		}

		if (context.listener.options.params) {
			extractParams(context.response, context.listener.options.params);
		}

		if (context.listener.options.requireProject === true) {
			context.response.params.project = robot.brain.get('gitlab_project_by_room_' + context.response.envelope.room);
			if (!context.response.params.project) {
				return context.response.reply(getSetProjectMessage());
			}
		}

		next();
	});


	// Project
	robot.respond(/p(?:roject)? search (.+)/i, {params: 'search', requireProject: true}, function(res) {
		gitlab.projects.search(res.params.search, function(records) {
			var msg = 'Here is your list of projects\n';

			res.reply(renderProjects(res, msg, records));
		});
	});

	robot.respond(/p(?:roject)? list/i, {params: 'project'}, function(res) {
		gitlab.projects.all(function(records) {
			var msg = 'Here is your list of projects\n';

			res.reply(renderProjects(res, msg, records));
		});
	});

	robot.respond(/p(?:roject)? set (\d+)/i, {params: 'project'}, function(res) {
		robot.brain.set('gitlab_project_by_room_'+res.envelope.room, res.params.project);
		res.reply(`Default project setted to \`${robot.brain.get('gitlab_project_by_room_'+res.envelope.room)}\``);
	});


	// User
	robot.respond(/u(?:ser)? list/i, function(res) {
		gitlab.users.all(function(records) {
			var msg = 'Here is your list of users\n';
			console.log(records);

			res.reply(renderUsers(res, msg, records));
		});
	});


	// Milestone
	robot.respond(/m(?:ilestone)? list\s?(all|opened|closed)*/i, {params: 'status', requireProject: true}, function(res) {
		gitlab.projects.milestones.all(res.params.project, function(records) {
			var msg = `Milestones from **Project #${res.params.project}**\n`;

			res.reply(renderMilestones(res, msg, records));
		});
	});


	// Builds
	robot.respond(/b(?:uilds)? list\s?(created|pending|running|failed|success|canceled|skipped)?/i, {params: 'scope', requireProject: true}, function(res) {
		var params = {};

		if (res.params.scope) {
			params.scope = res.params.scope;
		}

		gitlab.projects.builds.listBuilds(res.params.project, params, function(records) {
			var msg = `Builds from **Project #${res.params.project}**\n`;

			res.reply(renderBuilds(res, msg, records));
		});
	});

	robot.respond(/b(?:uilds)? play (\d+)/i, {params: 'build', requireProject: true}, function(res) {
		gitlab.projects.builds.play(res.params.project, res.params.build, function(record) {
			var msg = `Playing build ${res.params.build} in **Project #${res.params.project}**\n`;

			if (record == true) {
				return res.reply(msg+'Build already executed or nonexistent');
			}

			res.reply(renderBuilds(res, msg, [record]));
		});
	});

	robot.respond(/b(?:uilds)? retry (\d+)/i, {params: 'build', requireProject: true}, function(res) {
		gitlab.projects.builds.retry(res.params.project, res.params.build, function(record) {
			var msg = `Retrying build ${res.params.build} in **Project #${res.params.project}**\n`;

			res.reply(renderBuilds(res, msg, [record]));
		});
	});

	robot.respond(/b(?:uilds)? erase (\d+)/i, {params: 'build', requireProject: true}, function(res) {
		gitlab.projects.builds.erase(res.params.project, res.params.build, function(record) {
			var msg = `Erasing build ${res.params.build} in **Project #${res.params.project}**\n`;

			if (record == true) {
				return res.reply(msg+'Build already erased or nonexistent');
			}

			res.reply(renderBuilds(res, msg, [record]));
		});
	});

	// Issue
	robot.respond(/i(?:ssue)? list\s?(all|opened|closed)*/i, {params: 'status', requireProject: true}, function(res) {
		gitlab.projects.issues.list(res.params.project, function(records) {
			var msg = `Issues from **Project #${res.params.project}**\n`;

			res.reply(renderIssues(res, msg, records));
		});
	});

	robot.respond(/i(?:ssue)? create\s(.+)\s*\n?((?:.*\n?)*)/i, {params: 'title, description', requireProject: true}, function(res) {
		var data = {
			title: res.params.title,
			description: res.params.description
		};
		gitlab.issues.create(res.params.project, data, function(record) {
			var msg = `Issue created in **Project #${res.params.project}**\n`;

			res.reply(renderIssues(res, msg, [record]));
		});
	});

	robot.respond(/i(?:ssue)? (\d+) assign (\w+)/i, {params: 'issue, username', requireProject: true}, function(res) {
		gitlab.users.all(function(users) {
			var user = _.findWhere(users, {username: res.params.username});
			if (!user) {
				return res.reply(`User with username \`${res.params.username}\` not found`);
			}

			var data = {
				assignee_id: user.id
			};
			gitlab.issues.edit(res.params.project, res.params.issue, data, function(record) {
				var msg = `Issue assigned to \`${user.username}\` in **Project #${res.params.project}**\n`;

				res.reply(msg);
			});
		});
	});

	robot.respond(/i(?:ssue)? (\d+) (close|reopen)/i, {params: 'issue, action', requireProject: true}, function(res) {
		var data = {
			state_event: res.params.action
		};
		gitlab.issues.edit(res.params.project, res.params.issue, data, function(record) {
			var msg = `Issue ${record.id} is now ${record.state} in **Project #${res.params.project}**\n`;

			res.reply(renderIssues(res, msg, [record]));
		});
	});

	robot.respond(/i(?:ssue)? (\d+) (remove)/i, {params: 'issue, action', requireProject: true}, function(res) {
		gitlab.issues.remove(res.params.project, res.params.issue, function(record) {
			if (record === true) {
				res.reply(`Issue ${res.params.issue} was removed in **Project #${res.params.project}**`);
			} else {
				res.reply(`There was a problem removing issue ${res.params.isseu} in **Project #${res.params.project}**`);
			}
		});
	});


	// Pipeline
	robot.respond(/pi(?:peline)? list/i, {requireProject: true}, function(res) {
		gitlab.pipelines.all(res.params.project, function(records) {
			var msg = `Pipeline list in **Project #${res.params.project}**\n`;

			res.reply(renderPipelines(res, msg, records));
		});
	});


	// Deployments
	robot.respond(/d(?:eployment)? list/i, {requireProject: true}, function(res) {
		gitlab.deployments.all(res.params.project, function(records) {
			var msg = `Pipeline list in **Project #${res.params.project}**\n`;

			res.reply(renderPipelines(res, msg, records));
		});
	});
};
