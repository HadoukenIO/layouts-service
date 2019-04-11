pipeline {

    agent { label 'linux-slave' }

    stages {
        stage('Run Tests') {
            parallel {
                stage('Unit Tests') {
                    agent { label 'linux-slave' }
                    steps {
                        sh "npm i --ignore-scripts"
                        sh "npm run generate"
                        sh "npm run test:unit -- --color=false"
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
                        bat "npm run test:int -- --color=false --verbose"
                    }
                    post {
                        always {
                            junit "dist/test/results-int.xml"
                        }
                    }
                }
            }
        }

        stage('Build & Deploy (Staging)') {
            agent { label 'linux-slave' }
            when { branch "develop" }
            steps {
                script {
                    setEnvironmentVars("layouts", PKG_VERSION + "-alpha." + env.BUILD_NUMBER, "staging", "app.staging.json")
                }

                sh "npm i --ignore-scripts"
                sh "SERVICE_VERSION=${BUILD_VERSION} npm run build"
                sh "echo ${GIT_SHORT_SHA} > ./dist/SHA.txt"

                sh "npm run zip"
                sh "npm install bootprint@2.0.1 bootprint-json-schema@2.0.0-rc.3 --no-save"
                sh "npm run docs"

                sh "aws s3 cp ./res/provider ${DIR_BUILD_VERSION}/ --recursive"
                sh "aws s3 cp ./dist/provider ${DIR_BUILD_VERSION}/ --recursive"
                sh "aws s3 cp ./dist/client/openfin-${SERVICE_NAME}.js ${DIR_BUILD_VERSION}/"

                sh "aws s3 cp ./dist/docs ${DIR_DOCS_CHANNEL} --recursive"
                sh "aws s3 cp ./dist/docs ${DIR_DOCS_VERSION} --recursive"

                sh "aws s3 cp ./dist/provider/app.json ${DIR_BUILD_ROOT}${MANIFEST_NAME}"

                withCredentials([string(credentialsId: "NPM_TOKEN_WRITE", variable: 'NPM_TOKEN')]) {
                    sh "echo //registry.npmjs.org/:_authToken=$NPM_TOKEN > $WORKSPACE/.npmrc"
                }
                echo "publishing pre-release version to npm: " + BUILD_VERSION
                sh "npm version --no-git-tag-version " + BUILD_VERSION
                sh "npm publish --tag alpha"
                sh "npm version --no-git-tag-version " + PKG_VERSION
            }
        }

        stage('Build & Deploy (Production)') {
            agent { label 'linux-slave' }
            when { branch "master" }
            steps {
                script {
                    GIT_SHORT_SHA = sh ( script: "git rev-parse --short HEAD", returnStdout: true ).trim()
                    PKG_VERSION = sh ( script: "node -pe \"require('./package.json').version\"", returnStdout: true ).trim()

                    BUILD_VERSION = PKG_VERSION
                    CHANNEL = "stable"
                    MANIFEST_NAME = "app.json"
                    SERVICE_NAME = "layouts"

                    DIR_BUILD_ROOT = env.DSERVICE_S3_ROOT + SERVICE_NAME + "/"
                    DIR_BUILD_VERSION = DIR_BUILD_ROOT + BUILD_VERSION

                    DIR_DOCS_ROOT = env.DSERVICE_S3_ROOT_DOCS + SERVICE_NAME + "/"
                    DIR_DOCS_CHANNEL = DIR_DOCS_ROOT + CHANNEL
                    DIR_DOCS_VERSION = DIR_DOCS_ROOT + BUILD_VERSION
                }

                sh "npm i --ignore-scripts"
                sh "SERVICE_VERSION=${BUILD_VERSION} npm run build"
                sh "echo ${GIT_SHORT_SHA} > ./dist/SHA.txt"

                sh "npm run zip"
                sh "npm install bootprint@2.0.1 bootprint-json-schema@2.0.0-rc.3 --no-save"
                sh "npm run docs"
                sh "npm run channels"

                sh "aws s3 cp ./res/provider ${DIR_BUILD_VERSION}/ --recursive"
                sh "aws s3 cp ./dist/provider ${DIR_BUILD_VERSION}/ --recursive"
                sh "aws s3 cp ./dist/client/openfin-${SERVICE_NAME}.js ${DIR_BUILD_VERSION}/"

                sh "aws s3 cp ./dist/docs ${DIR_DOCS_CHANNEL} --recursive"
                sh "aws s3 cp ./dist/docs ${DIR_DOCS_VERSION} --recursive"

                sh "aws s3 cp ./dist/provider/app.json ${DIR_BUILD_ROOT}${MANIFEST_NAME}"
                sh "aws s3 cp ./dist/provider --exclude * --include app.runtime-*.json ${DIR_BUILD_ROOT}"

                withCredentials([string(credentialsId: "NPM_TOKEN_WRITE", variable: 'NPM_TOKEN')]) {
                    sh "echo //registry.npmjs.org/:_authToken=$NPM_TOKEN > $WORKSPACE/.npmrc"
                }
                echo "publishing to npm, version: " + BUILD_VERSION
                sh "npm publish"
            }
        }
    }
}

def setEnvironmentVars(serviceName, version, channel, manifestName) {
    env.GIT_SHORT_SHA = sh ( script: "git rev-parse --short HEAD", returnStdout: true ).trim()
    env.PKG_VERSION = sh ( script: "node -pe \"require('./package.json').version\"", returnStdout: true ).trim()

    env.BUILD_VERSION = env.PKG_VERSION
    env.CHANNEL = "stable"
    env.MANIFEST_NAME = "app.json"
    env.SERVICE_NAME = "layouts"

    env.DIR_BUILD_ROOT = env.DSERVICE_S3_ROOT + env.SERVICE_NAME + "/"
    env.DIR_BUILD_VERSION = DIR_BUILD_ROOT + env.BUILD_VERSION

    env.DIR_DOCS_ROOT = env.DSERVICE_S3_ROOT_DOCS + env.SERVICE_NAME + "/"
    env.DIR_DOCS_CHANNEL = env.DIR_DOCS_ROOT + env.CHANNEL
    env.DIR_DOCS_VERSION = env.DIR_DOCS_ROOT + env.BUILD_VERSION
}
