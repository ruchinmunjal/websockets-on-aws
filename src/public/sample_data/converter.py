import csv
import json

csv_file_path = 'sample_data.csv'
json_file_path = 'output.json'
table_name = 'prd-reporting'

def convert_csv_to_dynamodb_json(csv_file_path, json_file_path):
    with open(csv_file_path, 'r') as csv_file:
        reader = csv.DictReader(csv_file)
        items = []

        for row in reader:
            item = {}
            for key, value in row.items():
                if key in ['wrapper_no', 'valuation_date']:
                    item[key] = {'S': value}
                else:
                    item[key] = {'N': value}
            items.append({"PutRequest": {"Item": item}})

    with open(json_file_path, 'w') as json_file:
        json.dump({table_name: items}, json_file, indent=4)

convert_csv_to_dynamodb_json(csv_file_path, json_file_path)
