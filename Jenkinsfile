pipeline {

    agent { label 'linux-slave' }

    stages {

        stage ('test'){
            agent { label 'win10-dservices' }
            steps {
                bat "npm i"
                bat "npm run check"
                bat "npm test"
            }
        }

        stage ('build') {
            agent { label 'linux-slave' }
            when { branch "develop" }
            steps {
                sh "npm i --ignore-scripts"
                script {
                    GIT_SHORT_SHA = sh ( script: "git rev-parse --short HEAD", returnStdout: true ).trim()
                    VERSION = sh ( script: "node -pe \"require('./package.json').version\"", returnStdout: true ).trim()
                    PREREL_VERSION = VERSION + "-alpha." + env.BUILD_NUMBER
                    S3_LOC = env.DSERVICE_S3_ROOT + "layouts/" + GIT_SHORT_SHA
                    STAGING_JSON = env.DSERVICE_S3_ROOT + "layouts/" + "app.staging.json"
                }
                sh "GIT_SHORT_SHA=${GIT_SHORT_SHA} npm run build"
                sh "echo ${GIT_SHORT_SHA} > ./build/SHA.txt"
                sh "aws s3 cp ./build/provider ${S3_LOC}/ --recursive"
                sh "aws s3 cp ./build/docs ${S3_LOC}/docs/ --recursive"
                sh "aws s3 cp ./build/provider/app.json ${STAGING_JSON}"
                echo "publishing pre-release version to npm: " + PREREL_VERSION
                withCredentials([string(credentialsId: "NPM_TOKEN_WRITE", variable: 'NPM_TOKEN')]) {
                    sh "echo //registry.npmjs.org/:_authToken=$NPM_TOKEN > $WORKSPACE/.npmrc"
                }
                sh "npm version --no-git-tag-version " + PREREL_VERSION
                sh "npm publish --tag alpha"
                sh "npm version --no-git-tag-version " + VERSION
            }
        }

        stage ('build-prod') {
            agent { label 'linux-slave' }
            when { branch "master" }
            steps {
                sh "npm i --ignore-scripts"
                sh "npm run docs"
                script {
                    GIT_SHORT_SHA = sh ( script: "git rev-parse --short HEAD", returnStdout: true ).trim()
                    VERSION = sh ( script: "node -pe \"require('./package.json').version\"", returnStdout: true ).trim()
                    S3_LOC = env.DSERVICE_S3_ROOT + "layouts/" + GIT_SHORT_SHA
                    PROD_JSON = env.DSERVICE_S3_ROOT + "layouts/" + "app-" + VERSION + ".json"
                }
                sh "GIT_SHORT_SHA=${GIT_SHORT_SHA} npm run build"
                sh "echo ${GIT_SHORT_SHA} > ./build/SHA.txt"
                sh "aws s3 cp ./build/provider ${S3_LOC}/ --recursive"
                sh "aws s3 cp ./build/docs ${S3_LOC}/docs/ --recursive"
                sh "aws s3 cp ./build/provider/app.json ${PROD_JSON}"
                echo "publishing to npm, version: " + VERSION
                withCredentials([string(credentialsId: "NPM_TOKEN_WRITE", variable: 'NPM_TOKEN')]) {
                    sh "echo //registry.npmjs.org/:_authToken=$NPM_TOKEN > $WORKSPACE/.npmrc"
                }
                sh "npm publish"
            }
        }
    }
}