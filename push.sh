BUCKET=teenbhai-ws-client

aws s3 cp ./src/public s3://$BUCKET --recursive --acl public-read