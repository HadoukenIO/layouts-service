pipeline {

    agent { label 'linux-slave' }

    stages {
        stage ('test') {
            parallel {
                stage ('unit') {
                    steps {
                        bat "npm i"
                        bat "npm run test:unit -- --color=false --reporters=default --reporters=jest-junit"
                        bat "npm run check"
                    }
                    post {
                        always {
                            junit "$WORKSPACE/dist/test/results-unit.xml"
                        }
                    }
                }
                stage ('integration') {
                    agent { label 'win10-dservices' }
                    steps {
                        bat "npm i"
                        bat "npm test -- --verbose"
                    }
                    // Still needs some research:
                    //   - No obvious way to have ava write to both console and file
                    //   - Need to check that Jenkins env can read 'tap' output
                    // 
                    // post {
                    //     always {
                    //         step([$class: "TapPublisher", testResults: "$WORKSPACE/dist/test/results-int.txt"])
                    //     }
                    // }
                }
            }
        }

        stage ('build') {
            agent { label 'linux-slave' }
            when { branch "develop" }
            steps {
                script {
                    GIT_SHORT_SHA = sh ( script: "git rev-parse --short HEAD", returnStdout: true ).trim()
                    VERSION = sh ( script: "node -pe \"require('./package.json').version\"", returnStdout: true ).trim()
                    PREREL_VERSION = VERSION + "-alpha." + env.BUILD_NUMBER
                    S3_LOC = env.DSERVICE_S3_ROOT + "layouts/" + PREREL_VERSION
                    STAGING_JSON = env.DSERVICE_S3_ROOT + "layouts/app.staging.json"
                }
                sh "npm i --ignore-scripts"
                sh "SERVICE_VERSION=${PREREL_VERSION} npm run build"
                sh "echo ${GIT_SHORT_SHA} > ./dist/SHA.txt"
                sh "npm run zip"
                sh "npm run docs"
                sh "aws s3 cp ./res/provider ${S3_LOC}/ --recursive"
                sh "aws s3 cp ./dist/provider ${S3_LOC}/ --recursive"
                sh "aws s3 cp ./dist/docs ${S3_LOC}/docs/ --recursive"
                sh "aws s3 cp ./dist/provider/app.json ${STAGING_JSON}"
                withCredentials([string(credentialsId: "NPM_TOKEN_WRITE", variable: 'NPM_TOKEN')]) {
                    sh "echo //registry.npmjs.org/:_authToken=$NPM_TOKEN > $WORKSPACE/.npmrc"
                }
                echo "publishing pre-release version to npm: " + PREREL_VERSION
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
                script {
                    GIT_SHORT_SHA = sh ( script: "git rev-parse --short HEAD", returnStdout: true ).trim()
                    VERSION = sh ( script: "node -pe \"require('./package.json').version\"", returnStdout: true ).trim()
                    S3_LOC = env.DSERVICE_S3_ROOT + "layouts/" + VERSION
                    PROD_JSON = env.DSERVICE_S3_ROOT + "layouts/app.json"
                }
                sh "SERVICE_VERSION=${VERSION} npm run build"
                sh "echo ${GIT_SHORT_SHA} > ./dist/SHA.txt"
                sh "npm run zip"
                sh "npm run docs"
                sh "aws s3 cp ./res/provider ${S3_LOC}/ --recursive"
                sh "aws s3 cp ./dist/provider ${S3_LOC}/ --recursive"
                sh "aws s3 cp ./dist/docs ${S3_LOC}/docs/ --recursive"
                sh "aws s3 cp ./dist/provider/app.json ${PROD_JSON}"
                withCredentials([string(credentialsId: "NPM_TOKEN_WRITE", variable: 'NPM_TOKEN')]) {
                    sh "echo //registry.npmjs.org/:_authToken=$NPM_TOKEN > $WORKSPACE/.npmrc"
                }
                echo "publishing to npm, version: " + VERSION
                sh "npm publish"
            }
        }
    }
}
