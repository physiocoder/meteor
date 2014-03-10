##Translating Meteor documentation: a workflow

Here are the steps used to translate and then manage documentation translation (inspired by [Contributing to Meteor guidelines](https://github.com/meteor/meteor/wiki/Contributing-to-Meteor)):

1. Forked entire Meteor repository on GitHub

2. Cloned locally on my Macbook:

        git clone https://github.com/physiocoder/meteor
        cd meteor

3. Created a new branch (`it-docs`) starting from `devel` branch:

        git checkout devel
        git branch it-docs
        git checkout it-docs

4. Edited and translated `docs` directory (.html and .js files) preserving markdown and template structure

5. Committed translation work:

        git commit -a -m "Commit message describing translation work"

6. Pushed commits to GitHub:

        (first time)      git push --set-upstream origin it-docs
        (from second on)  git push

7. Published online with

        meteor deploy it-docs.meteor.com

In order to stay in sync with Meteor development, on my local repository (inspired by [Syncing a fork](https://help.github.com/articles/syncing-a-fork)):

1. Create un `upstream` remote reference to original repository:

        git remote add upstream https://github.com/meteor/meteor

2. Fetch the original repository in special local branches (`upstream/branchnames`):

        git fetch upstream

3. Merge `upstream/devel` with `it-docs`

        git checkout it-docs
        git merge upstream/devel

4. If there are no update to original docs `merge` goes flawless with fast forward. DONE!

5. If there were updates in original docs that conflicts with translation already done, `git merge` outputs an error signaling files with such conflicts. To resolve conflicts invoke `FileMerge` utility with:

        git mergetool -t opendiff

5. `FileMerge` provides a GUI where you will see translated doc on the left, original updated doc on the right and the proposed merged file on the bottom. By default proposed merged is just what we want: a translated doc where updated parts are again in english. Save merged file and say `y` if asked `Was the merge successful? [y/n]` at command prompt.

6. Commit merge and accept default commit message with:

        git commit

7. Edit files containing conflicts translating only merged english parts. Then:

        git commit -a -m "Translated conflicts from last merge"

DONE!

####Last but not least:

- Called for contributors on `meteor-talk` and Twitter (they can fork my rep, create a new branch and then send me a pull request to `it-docs`);  
- Made `it-docs` branch the default on my fork on GitHub so when people come visit my rep they land on translation branch;

I know, seems a little bit long and difficult but hope this could be of help as a reference for translating Meteor Docs.

####UPDATE - Improvements

Wondering if it's better to create the translation branch from `master` instead of `devel`: [Meteor guidelines](https://github.com/meteor/meteor/wiki/Contributing-to-Meteor) suggests to create a branch off `devel` because in the end it is where they will (in case) merge your pull request. But since translation is a fork that will not be eventually merged, maybe `master` is a better and more stable branch to base translations on.
