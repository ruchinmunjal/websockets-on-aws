# Sample requests
Below is a sample request which is based on data present in the db.

## Working request
After connection is opened, send the below request

```!JSON
{"action":"report","connectionId":"anbNhcFkLPECF0A=", "wrapperId":11132018, "startDate":"2023-01-01","endDate":"2023-01-08"}
```

## Todo
Ideally we should be able to send multiple wrappers, but currently this is not supported in the lambda handler

```!JSON
{"action":"report", "wrappers":[{"wrapperId":11132018, "startDate":"2023-01-01","endDate":"2023-01-08"}]}
```