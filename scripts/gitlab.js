// Description:
// Create and mark tasks to do, done, etc.
// Commands:
// hubot p|project search <term>
// hubot p|project list
// hubot p|project set <project_id>
// hubot m|milestone list <project_id>
// hubot i|issues list <project_id>

// Dependencies:
// hubot-redis-brain node-gitlab
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

	robot.brain.on('loaded', function() {

	});

	function limitResult(res, result) {
		if (res.params.limit > 0) {
			return result.slice(0, res.params.limit);
		}
		return result;
	}

	function extractParams(res, params) {
		params = params.replace(/\s+/g, '').split(',');

		res.params = {};

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
			msg += `\n\nUse \`bot gitlab set project #PROJECT_ID\` to set default project`;
		}

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


	// Project
	robot.respond(/p(?:roject)? search (.+)/i, function(res) {
		extractParams(res, 'search, project');
		res.reply('I\'ll check around for that project of yours...');
		gitlab.projects.search(res.params.search, function(records) {
			var msg = 'Here is your list of projects\n';

			res.reply(renderProjects(res, msg, records));
		});
	});

	robot.respond(/p(?:roject)? list(\sall)*/i, function(res) {
		extractParams(res, 'status, project');
		res.reply('Ok child, let me fetch some projects for you. Hang on just a sec.');
		gitlab.projects.all(function(records) {
			var msg = 'Here is your list of projects\n';

			res.reply(renderProjects(res, msg, records));
		});
	});

	robot.respond(/p(?:roject)? set (\d+)/i, function(res) {
		extractParams(res, 'project');
		robot.brain.set('gitlab_project_by_room_'+res.envelope.room, res.params.project);
		res.reply(`Default project setted to \`${robot.brain.get('gitlab_project_by_room_'+res.envelope.room)}\``);
	});


	// Milestone
	robot.respond(/m(?:ilestone)? list\s?(\d+)?\s?(all|opened|closed)*/i, function(res) {
		extractParams(res, 'project, status');
		res.reply('Ok, sure...you want to see the big picture? Fetching milestones...');
		gitlab.projects.milestones.all(res.params.project, function(records) {
			var msg = `Milestones from **Project #${res.params.project}**\n`;

			res.reply(renderMilestones(res, msg, records));
		});
	});


	// Issue
	robot.respond(/i(?:ssue)? list\s?(\d+)?\s?(all|opened|closed)*/i, function(res) {
		extractParams(res, 'project, status');
		res.reply('Let me check the exu-tracker for some issues...hang on a while.');
		gitlab.projects.issues.list(res.params.project, function(records) {
			var msg = `Issues from **Project #${res.params.project}**\n`;

			res.reply(renderIssues(res, msg, records));
		});
	});
};
