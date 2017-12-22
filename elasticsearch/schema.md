`
PUT /metrics
{
    "order" : 0,
    "template" : "metrics-*",
    "settings" : {
      "index" : {
        "refresh_interval" : "5s"
      }
    },
    "mappings" : {
      "_default_" : {
        "dynamic_templates" : [ {
          "strings" : {
            "mapping" : {
              "index" : "not_analyzed",
              "type" : "string",
              "doc_values" : true
            },
            "match_mapping_type" : "string",
            "match" : "*"
          }
        } ],
        "properties" : {
          "source" : {
            "type" : "text"
          },
          "gas" : {
            "type" : "text"
          },
          "value" : {
            "index" : false,
            "type" : "integer",
            "doc_values" : true
          },
          "location" : {
            "type" : "geo_point",
            "doc_values" : true
          },
          "@timestamp" : {
            "type" : "date",
            "doc_values" : true
          }
        }
      }
    },
    "aliases" : { }
}
`