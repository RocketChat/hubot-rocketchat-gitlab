Path = require 'path'

module.exports = (robot) ->
  path = Path.resolve __dirname, 'lib'
  robot.load path
