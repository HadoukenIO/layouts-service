pipeline {

    agent { label 'linux-slave' }

    stages {
        stage('Run Tests') {
            parallel {
                stage('Unit Tests') {
                    agent { label 'linux-slave' }
                    steps {
                        sh "npm i"
                        sh "npm run test:unit -- --color=false --reporters=default --reporters=jest-junit"
                        sh "npm run check"
                    }
                    post {
                        always {
                            junit "dist/test/results-unit.xml"
                        }
                    }
                }

                stage('Integration Tests') {
                    agent { label 'win10-dservices' }
                    steps {
                        bat "npm i"
                        bat "npm run test:int -- --verbose"
                    }
                    // Still needs some research:
                    //   - No obvious way to have ava write to both console and file
                    //   - Need to check that Jenkins env can read 'tap' output
                    // 
                    // post {
                    //     always {
                    //         step([$class: "TapPublisher", testResults: "dist/test/results-int.txt"])
                    //     }
                    // }
                }
            }
        }

        stage('Build & Deploy (Staging)') {
            agent { label 'linux-slave' }
            when { branch "develop" }
            steps {
                script {
                    GIT_SHORT_SHA = sh ( script: "git rev-parse --short HEAD", returnStdout: true ).trim()
                    PKG_VERSION = sh ( script: "node -pe \"require('./package.json').version\"", returnStdout: true ).trim()

                    BUILD_VERSION = PKG_VERSION + "-alpha." + env.BUILD_NUMBER
                    CHANNEL = "staging"
                    MANIFEST_NAME = "app.staging.json"

                    S3_LOC = env.DSERVICE_S3_ROOT + "layouts/" + BUILD_VERSION
                    DOCS_CHANNEL_LOC = env.DSERVICE_S3_ROOT_DOCS + "layouts/" + CHANNEL
                    DOCS_VERSIONED_LOC = env.DSERVICE_S3_ROOT_DOCS + "layouts/" + BUILD_VERSION
                    MANIFEST_LOC = env.DSERVICE_S3_ROOT + "layouts/" + MANIFEST_NAME
                }
                sh "npm i --ignore-scripts"
                sh "SERVICE_VERSION=${BUILD_VERSION} npm run build"
                sh "echo ${GIT_SHORT_SHA} > ./dist/SHA.txt"
                sh "npm run zip"
                sh "npm install bootprint@2.0.1 bootprint-json-schema@2.0.0-rc.3 --no-save"
                sh "npm run docs"
                sh "aws s3 cp ./res/provider ${S3_LOC}/ --recursive"
                sh "aws s3 cp ./dist/provider ${S3_LOC}/ --recursive"
                sh "aws s3 cp ./dist/client/openfin-layouts.js ${S3_LOC}/"

                sh "aws s3 rm ${DOCS_CHANNEL_LOC} --recursive"
                sh "aws s3 cp ./dist/docs ${DOCS_CHANNEL_LOC} --recursive"
                sh "aws s3 cp ./dist/docs ${DOCS_VERSIONED_LOC} --recursive"
                sh "aws s3 cp ./dist/provider/app.json ${MANIFEST_LOC}"
                withCredentials([string(credentialsId: "NPM_TOKEN_WRITE", variable: 'NPM_TOKEN')]) {
                    sh "echo //registry.npmjs.org/:_authToken=$NPM_TOKEN > $WORKSPACE/.npmrc"
                }
                echo "publishing pre-release version to npm: " + BUILD_VERSION
                sh "npm version --no-git-tag-version " + BUILD_VERSION
                sh "npm publish --tag alpha"
                sh "npm version --no-git-tag-version " + PKG_VERSION
            }
        }

        stage ('Build & Deploy (Production)') {
            agent { label 'linux-slave' }
            when { branch "master" }
            steps {
                script {
                    GIT_SHORT_SHA = sh ( script: "git rev-parse --short HEAD", returnStdout: true ).trim()
                    PKG_VERSION = sh ( script: "node -pe \"require('./package.json').version\"", returnStdout: true ).trim()

                    BUILD_VERSION = PKG_VERSION
                    CHANNEL = "stable"
                    MANIFEST_NAME = "app.json"

                    S3_LOC = env.DSERVICE_S3_ROOT + "layouts/" + BUILD_VERSION
                    DOCS_CHANNEL_LOC = env.DSERVICE_S3_ROOT_DOCS + "layouts/" + CHANNEL
                    DOCS_VERSIONED_LOC = env.DSERVICE_S3_ROOT_DOCS + "layouts/" + BUILD_VERSION
                    MANIFEST_LOC = env.DSERVICE_S3_ROOT + "layouts/" + MANIFEST_NAME
                }
                sh "npm i --ignore-scripts"
                sh "SERVICE_VERSION=${BUILD_VERSION} npm run build"
                sh "echo ${GIT_SHORT_SHA} > ./dist/SHA.txt"
                sh "npm run zip"
                sh "npm install bootprint@2.0.1 bootprint-json-schema@2.0.0-rc.3 --no-save"
                sh "npm run docs"
                sh "aws s3 cp ./res/provider ${S3_LOC}/ --recursive"
                sh "aws s3 cp ./dist/provider ${S3_LOC}/ --recursive"
                sh "aws s3 cp ./dist/client/openfin-layouts.js ${S3_LOC}/"

                sh "aws s3 rm ${DOCS_CHANNEL_LOC} --recursive"
                sh "aws s3 cp ./dist/docs ${DOCS_CHANNEL_LOC} --recursive"
                sh "aws s3 cp ./dist/docs ${DOCS_VERSIONED_LOC} --recursive"
                sh "aws s3 cp ./dist/provider/app.json ${MANIFEST_LOC}"
                withCredentials([string(credentialsId: "NPM_TOKEN_WRITE", variable: 'NPM_TOKEN')]) {
                    sh "echo //registry.npmjs.org/:_authToken=$NPM_TOKEN > $WORKSPACE/.npmrc"
                }
                echo "publishing to npm, version: " + BUILD_VERSION
                sh "npm publish"
            }
        }
    }
}
