// Description:
//   Create and mark tasks to do, done, etc.
// Commands:
//   hubot a|ccess config <access_token> <gitlab_url>
//   hubot p|project list
//   hubot p|project set <project_id>
//   hubot p|project search <term>
//   hubot i|issue list <all|opened|closed>?
//   hubot i|issue create <title>\n<body>
//   hubot i|issue assign <issue_id> <username>
//   hubot i|issue <close|reopen|remove> <issue_id>
//   hubot u|user list
//   hubot m|milestone list <all|opened|closed>?
//   hubot b|build list <created|pending|running|failed|success|canceled|skipped>?
//   hubot b|build play <build_id>
//   hubot b|build retry <build_id>
//   hubot b|build erase <build_id>
//   hubot pi|pipeline list
//   hubot d|deployment list

// Dependencies:
//   hubot-redis-brain node-gitlab
/*jslint node: true*/

module.exports = function(robot) {
	var GITLAB_RECORD_LIMIT = process.env.GITLAB_RECORD_LIMIT || 20;
	var GITLAB_URL = process.env.GITLAB_URL || "https://gitlab.com";
	var GITLAB_TOKEN = process.env.GITLAB_TOKEN || false;

	var gitlab = {};

	var _ = require('underscore');
	var help = {};

	robot.brain.on('loaded', function() {
		robot.logger.info("[INFO] I have a brain...");
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
	}

	function getSetProjectMessage() {
		var robot_name = robot.alias || robot.name;
		return `Use \`${robot_name} project set #PROJECT_ID\` to set default project`;
	}

	function getGitlabToken() {
		var robot_name = robot.alias || robot.name;
		return `Use \`${robot_name} access config GITLAB_TOKEN GITLAB_URL\` to set gitlab's access key`;
	}

	// Renders
	function renderProjects(res, msg, records) {
		var found = false;
		_.forEach(limitResult(res, records), function(item) {
			msg += `\n${item.id} - ${item.path_with_namespace}`;

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
		var initialLength = msg.length;
		var found = false;
		_.forEach(limitResult(res, records), function(item) {
			msg += `\n${item.id} - ${item.username} - ${item.name}`;
		});
		if(msg.length <= initialLength)	msg += `\n **No users found in this project**`;
		return msg;
	}

	function renderMilestones(res, msg, records) {
		var initialLength = msg.length;
		_.forEach(limitResult(res, records), function(item) {
			msg += `\n${item.iid} - ${item.title}`;
			if (item.state === 'closed') {
				msg += ' **CLOSED**';
			}
		});
		if(msg.length <= initialLength)	msg += `\n **No milestones found in this project**`;
		return msg;
	}

	function renderIssues(res, msg, records) {
		var initialLength = msg.length;
		_.forEach(limitResult(res, records), function(item) {
			msg += `\n${item.iid} - ${item.title}`;
			if (item.state === 'closed') {
				msg += ' **CLOSED**';
			}
		});
		if(msg.length <= initialLength)	msg += `\n **No issues found in this project**`;
		return msg;
	}

	function renderPipelines(res, msg, records) {
		var initialLength = msg.length;
		_.forEach(limitResult(res, records), function(item) {
			msg += `\n- ${item.id} - ${item.ref} - **${item.status}**`;
		});
		if(msg.length <= initialLength)	msg += `\n **No pipelines found in this project**`;
		return msg;
	}

	function renderBuilds(res, msg, records) {
		var initialLength = msg.length;
		_.forEach(limitResult(res, records), function(item) {
			msg += `\n- ${item.id} - ${item.name} (stage: ${item.stage}, branch: ${item.ref}) - **${item.status}**`;
		});
		robot.logger.info("[DEBUG] renderBuilds On! msg= "+ msg + " length:" + msg.length);

		if(msg.length <= initialLength)	msg += `\n **No builds found in this project**`;

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
		// set GITLAB_TOKEN and GITLAB_URL
		if (!context.response.params.gitlab_token) {
			context.response.params.gitlab_token = robot.brain.get('gitlab_token_by_room_' + context.response.envelope.room);
		  context.response.params.gitlab_url = robot.brain.get('gitlab_url_by_room_' + context.response.envelope.room);
			if (!context.response.params.gitlab_url) {
				robot.brain.set('gitlab_url_by_room_'+context.response.envelope.room, GITLAB_URL);
			}
			if (!context.response.params.gitlab_token && !GITLAB_TOKEN) {
				return context.response.reply(getGitlabToken());
			}else if (!context.response.params.gitlab_token && GITLAB_TOKEN !== false){
				robot.brain.set('gitlab_token_by_room_'+context.response.envelope.room, GITLAB_TOKEN);
			}
		}

		gitlab[context.response.envelope.room] = require('gitlab')({
			url: robot.brain.get('gitlab_url_by_room_'+context.response.envelope.room),
			token: robot.brain.get('gitlab_token_by_room_'+context.response.envelope.room)
		});

		next();
	});

	robot.respond(/a(?:ccess)? config (.+) (.+)/i, {params: 'gitlab_token, gitlab_url'}, function(res) {
		robot.logger.info("[INFO] ACCESS CONFIG STARTED");
		if(!res.params.gitlab_url){
			robot.logger.info("[INFO] ACCESS CONFIG URL not in params, setting default gitlab.com");
			res.params.gitlab_url = "https://gitlab.com";
		}
		if(!res.params.gitlab_token){
			return res.reply(`You need to specify an access token and a gitlab url...`);
		} else {
			robot.logger.info("[INFO] ACCESS CONFIG PARAMS given, setting in brain");
			robot.brain.set('gitlab_token_by_room_'+res.envelope.room, res.params.gitlab_token);
			robot.brain.set('gitlab_url_by_room_'+res.envelope.room, res.params.gitlab_url);

			gitlab[res.envelope.room] = require('gitlab')({
				url: robot.brain.get('gitlab_url_by_room_'+res.envelope.room),
				token: robot.brain.get('gitlab_token_by_room_'+res.envelope.room)
			});

			res.reply(`Access Token setted to \`#${robot.brain.get('gitlab_token_by_room_'+res.envelope.room)} on ${robot.brain.get('gitlab_url_by_room_'+res.envelope.room)}\``);
		}
	});


	// Project
	robot.respond(/p(?:roject)? search (.+)/i, {params: 'search', requireProject: true}, function(res) {
		gitlab[res.envelope.room].projects.search(res.params.search, function(records) {
			var msg = 'Here is your list of projects\n';

			res.reply(renderProjects(res, msg, records));
		});
	});

	robot.respond(/p(?:roject)? list/i, {params: 'project'}, function(res) {
		gitlab[res.envelope.room].projects.all(function(records) {
			var msg = 'Here is your list of projects\n';

			res.reply(renderProjects(res, msg, records));
		});
	});

	robot.respond(/p(?:roject)? set (\d+)/i, {params: 'project'}, function(res) {
		gitlab[res.envelope.room].projects.show(res.params.project, function(record) {
			if (!record) {
				return res.reply(`Project #${res.params.project} not found`);
			}

			robot.brain.set('gitlab_project_by_room_'+res.envelope.room, record.id);
			res.reply(`Default project setted to \`#${robot.brain.get('gitlab_project_by_room_'+res.envelope.room)} - ${record.name}\``);
		});
	});

	// User
	robot.respond(/u(?:ser)? list/i, function(res) {
		gitlab[res.envelope.room].users.all(function(records) {
			var msg = 'Here is your list of users\n';
			console.log(records);

			res.reply(renderUsers(res, msg, records));
		});
	});


	// Milestone
	robot.respond(/m(?:ilestone)? list\s?(all|opened|closed)*/i, {params: 'status', requireProject: true}, function(res) {
		gitlab[res.envelope.room].projects.milestones.all(res.params.project, function(records) {
			var msg = `Milestones from **Project #${res.params.project}**\n`;

			res.reply(renderMilestones(res, msg, records));
		});
	});


	// Builds
	robot.respond(/b(?:uild)? list\s?(created|pending|running|failed|success|canceled|skipped)?/i, {params: 'scope', requireProject: true}, function(res) {
		var params = {};

		if (res.params.scope) {
			params.scope = res.params.scope;
		}

		gitlab[res.envelope.room].projects.builds.listBuilds(res.params.project, params, function(records) {
			var msg = `Builds from **Project #${res.params.project}**\n`;

			res.reply(renderBuilds(res, msg, records));
		});
	});

	robot.respond(/b(?:uild)? play (\d+)/i, {params: 'build', requireProject: true}, function(res) {
		gitlab[res.envelope.room].projects.builds.play(res.params.project, res.params.build, function(record) {
			var msg = `Playing build ${res.params.build} in **Project #${res.params.project}**\n`;

			if (record == true) {
				return res.reply(msg+'Build already executed or nonexistent');
			}

			res.reply(renderBuilds(res, msg, [record]));
		});
	});

	robot.respond(/b(?:uild)? retry (\d+)/i, {params: 'build', requireProject: true}, function(res) {
		gitlab[res.envelope.room].projects.builds.retry(res.params.project, res.params.build, function(record) {
			var msg = `Retrying build ${res.params.build} in **Project #${res.params.project}**\n`;

			res.reply(renderBuilds(res, msg, [record]));
		});
	});

	robot.respond(/b(?:uild)? erase (\d+)/i, {params: 'build', requireProject: true}, function(res) {
		gitlab[res.envelope.room].projects.builds.erase(res.params.project, res.params.build, function(record) {
			var msg = `Erasing build ${res.params.build} in **Project #${res.params.project}**\n`;

			if (record == true) {
				return res.reply(msg+'Build already erased or nonexistent');
			}

			res.reply(renderBuilds(res, msg, [record]));
		});
	});

	// Issue
	robot.respond(/i(?:ssue)? list\s?(all|opened|closed)*/i, {params: 'status', requireProject: true}, function(res) {
		gitlab[res.envelope.room].projects.issues.list(res.params.project, function(records) {
			var msg = `Issues from **Project #${res.params.project}**\n`;

			res.reply(renderIssues(res, msg, records));
		});
	});

	robot.respond(/i(?:ssue)? create\s(.+)\s*\n?((?:.*\n?)*)/i, {params: 'title, description', requireProject: true}, function(res) {
		var data = {
			title: res.params.title,
			description: res.params.description
		};
		gitlab[res.envelope.room].issues.create(res.params.project, data, function(record) {
			var msg = `Issue created in **Project #${res.params.project}**\n`;

			res.reply(renderIssues(res, msg, [record]));
		});
	});

	robot.respond(/i(?:ssue)? assign (\d+) (\w+)/i, {params: 'issue, username', requireProject: true}, function(res) {
		gitlab[res.envelope.room].users.all(function(users) {
			var user = _.findWhere(users, {username: res.params.username});
			if (!user) {
				return res.reply(`User with username \`${res.params.username}\` not found`);
			}

			var data = {
				assignee_id: user.id
			};
			gitlab[res.envelope.room].issues.edit(res.params.project, res.params.issue, data, function(record) {
				var msg = `Issue assigned to \`${user.username}\` in **Project #${res.params.project}**\n`;

				res.reply(msg);
			});
		});
	});

	robot.respond(/i(?:ssue)? (close|reopen) (\d+)/i, {params: 'action, issue', requireProject: true}, function(res) {
		var data = {
			state_event: res.params.action
		};
		gitlab[res.envelope.room].issues.edit(res.params.project, res.params.issue, data, function(record) {
			// robot.logger.debug(record);
			if (record !== null ){
				var msg = `Issue ${record.id} is now ${record.state} in **Project #${res.params.project}**\n`;
				res.reply(renderIssues(res, msg, [record]));
			}else{
				res.reply(`There was a problem editing issue #${res.params.issue}`);
			}

		});
	});

	robot.respond(/i(?:ssue)? (remove) (\d+)/i, {params: 'action, issue', requireProject: true}, function(res) {
		gitlab[res.envelope.room].issues.remove(res.params.project, res.params.issue, function(record) {
			if (record === true) {
				res.reply(`Issue ${res.params.issue} was removed in **Project #${res.params.project}**`);
			} else {
				res.reply(`There was a problem removing issue ${res.params.issue} in **Project #${res.params.project}**`);
			}
		});
	});


	// Pipeline
	robot.respond(/pi(?:peline)? list/i, {requireProject: true}, function(res) {
		gitlab[res.envelope.room].pipelines.all(res.params.project, function(records) {
			var msg = `Pipeline list in **Project #${res.params.project}**\n`;

			res.reply(renderPipelines(res, msg, records));
		});
	});


	// Deployments
	robot.respond(/d(?:eployment)? list/i, {requireProject: true}, function(res) {
		gitlab[res.envelope.room].deployments.all(res.params.project, function(records) {
			var msg = `Pipeline list in **Project #${res.params.project}**\n`;

			res.reply(renderPipelines(res, msg, records));
		});
	});
};
