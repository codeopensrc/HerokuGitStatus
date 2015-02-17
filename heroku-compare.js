var Heroku = require("heroku");
var GitAPI = require('github');
var colors = require("colors");

var heroToken = process.env.HEROKU_TOKEN;
var gitToken = process.env.GITHUB_TOKEN;

var heroku = new Heroku.Heroku({key: heroToken});
var github = new GitAPI({  version: "3.0.0"  });

github.authenticate({
    type: "oauth",
    token: gitToken
});

var USER_NAME = "NAQ";

String.prototype.padRight = function (len) {
  if(this.length < len) {
    return String(this + (Array(len - this.length + 1).join(' ')))
  }
  else {
    return String(this);
  }
}

///TODO implement error catching

function getGit (callback) {
  var gitRepos = [];
  github.repos.getFromOrg({org: "NAQ"}, function (err, repos) {
    repos.forEach(function (repo) {
      github.repos.getBranches({user: repo.owner.login, repo: repo.name}, function (err, branches) {
        branches.forEach(function (branch) {
          if(branch.name === 'master') {
            gitRepos[gitRepos.length] = {name: repo.name, gitCommit: branch.commit.sha.slice(0,7), branchCount: branches.length-1}
          }
        })
        if(gitRepos.length === repos.length) {
          callback(null, gitRepos)
        }
      })
    })
  })
}

function getHeroku(callback) {
  var herokuRepos = [];
  heroku.get_apps(function (err, apps) {
    for(var i in apps) {
      (function (i) {
        heroku.get_releases(apps[i].name, function (err, res) {
          herokuRepos[herokuRepos.length] = {name: apps[i].name, herokuCommit: res[res.length-1].commit}
          if(herokuRepos.length === apps.length) {
            callback(null, herokuRepos);
          }
        })
      })(i)
    }
  })
}

function getRepos(git, heroku, cb) {
  var REPO = {
    gitArr: [],
    heroArr: []
  }
  git(function (err, gitRepos) {
    gitRepos.forEach(function (repo) {
      REPO.gitArr[REPO.gitArr.length] = repo;
      if(REPO.gitArr.length === gitRepos.length) {
          cb(REPO);
      }
    })
  })

  heroku(function (err, herokuRepos) {
    herokuRepos.forEach(function (repo) {
      REPO.heroArr[REPO.heroArr.length] = repo;
      if(REPO.heroArr.length === herokuRepos.length) {
        cb(REPO);
      }
    });
  });

}

var heroRepoNames = require('../heroku_github_namemap.json');

////////////^^^ FUNCTIONS//////// CALLS


getRepos(getGit, getHeroku, function (repos) {
  //Result contains all repos from git/heroku as an object in the form of:
  //  repos = {gitArr: [{}, {} ...], heroArr: [{}, {} ...]}
  //Git array = [{name: "RepoName", gitCommit: "7 dig Sha Number"}, {}, {} ...]
  //Heroku array = [{name: "RepoName", herokuCommit: "7 dig Sha Number"}, {}, {} ...]
  // TODO make gitCommit and herokuCommit = commit
  if(repos.gitArr.length && repos.heroArr.length) {
    console.log(); //// Buffer
    console.log("---------- Repo -------- ||  ---- Git ---  ||  -- Heroku -- ");
    repos.gitArr.forEach(function (gitRepo) {
      repos.heroArr.forEach(function (heroRepo) {
        if(gitRepo.name === heroRepoNames[heroRepo.name]) {
          var str = gitRepo.name.padRight(24)+" ||  Sha: "+ gitRepo.gitCommit+"  ||  Sha: "+ heroRepo.herokuCommit+ "  === ";
          var flag = gitRepo.gitCommit === heroRepo.herokuCommit ? str.green+"Match".padRight(12).green : str.red+"OUT OF DATE".padRight(12).red;
          flag = (gitRepo.branchCount > 0) ? flag+String("== "+gitRepo.branchCount).yellow+" branch(es)".yellow : flag;
          console.log(flag);
        }
      })
    })
  }
});