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

3. Merge `upstream/devel` with `devel`

        git checkout devel
        git merge upstream/devel

4. Merge `it-docs` with `devel`:

        git checkout it-docs
        git merge devel

Having in my local repository both `devel` and `upstream/devel` I can check the official updates to the documentation before merging (step 3) with:

        git diff devel upstream/devel -- docs

In this way I can see only updates to the `docs` section and if they are of some interest to my translation.
If there are, they will be signaled by `git` in the last merge (step 4) and I can choose to update translation accordingly.

####Last but not least:

- Called for contributors on `meteor-talk` and Twitter (they can fork my rep, create a new branch and then send me a pull request to it-docs);  
- Made `it-docs` branch the default on my fork on GitHub so when people come visit my rep they land on translation branch;

I know, seems a little bit long and difficult but hope this could be of help as a reference for translating Meteor Docs.
