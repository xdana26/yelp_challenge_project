import os, copy
from flask import Flask, jsonify, request, send_from_directory, make_response, current_app
from datetime import timedelta
from functools import update_wrapper
app = Flask(__name__, static_url_path='')


# decorator for CORS
def crossdomain(origin=None, methods=None, headers=None,
                max_age=21600, attach_to_all=True,
                automatic_options=True):
    if methods is not None:
        methods = ', '.join(sorted(x.upper() for x in methods))
    if headers is not None and not isinstance(headers, basestring):
        headers = ', '.join(x.upper() for x in headers)
    if not isinstance(origin, basestring):
        origin = ', '.join(origin)
    if isinstance(max_age, timedelta):
        max_age = max_age.total_seconds()

    def get_methods():
        if methods is not None:
            return methods

        options_resp = current_app.make_default_options_response()
        return options_resp.headers['allow']

    def decorator(f):
        def wrapped_function(*args, **kwargs):
            if automatic_options and request.method == 'OPTIONS':
                resp = current_app.make_default_options_response()
            else:
                resp = make_response(f(*args, **kwargs))
            if not attach_to_all and request.method != 'OPTIONS':
                return resp

            h = resp.headers

            h['Access-Control-Allow-Origin'] = origin
            h['Access-Control-Allow-Methods'] = get_methods()
            h['Access-Control-Max-Age'] = str(max_age)
            if headers is not None:
                h['Access-Control-Allow-Headers'] = headers
            return resp

        f.provide_automatic_options = False
        return update_wrapper(wrapped_function, f)
    return decorator

# get root
@app.route("/")
def index():
    return app.make_response(open('app/index.html').read())

# send assets (ex. assets/js/random_triangle_meshes/random_triangle_meshes.js)
# blocks other requests, so your directories won't get listed (ex. assets/js will return "not found")
@app.route('/assets/<path:path>')
def send_assets(path):
    return send_from_directory('app/assets/', path)

# final project
@app.route("/yelp")
def project():
    return app.make_response(open('app/assets/html/final_project.html').read())

@app.route('/three/<path:path>')
def open_three(path):
	return send_from_directory('app/assets/html/',path)

# API
# final project data (temporarily held on this website)
import json, collections 
data = []
restaurant_data = []
with open('app/assets/json/yelp_data.json') as f:
	for line in f:
		if "Las Vegas" in line:
			data.append(json.loads(line))
			if "Restaurants" in line:
				restaurant_data.append(json.loads(line))

@app.route('/api/v1.0/data/some_data/', methods=['GET', 'OPTIONS'])
@crossdomain(origin='*')
def get_some_data():
	#return jsonify({'businesses':data})
	return json.dumps(restaurant_data)
    #with open('app/assets/json/baseball.json') as data_file:
	#return json.dumps(json.load(data_file))

@app.route('/api/v1.0/data/some_data/limit/<int:n_entries>/', methods=['GET'])
def get_some_data_limit(n_entries):
	return json.dumps(restaurant_data[0:n_entries])

# final backend tutorial stuff

@app.route('/trellis', methods=['GET'])
def get_trellis():
	with open('app/assets/data/trellis.json') as data_file:
		return json.dumps(json.load(data_file))

@app.route('/trellis/limit/<int:n_entries>/', methods=['GET'])
def get_trellis_limit(n_entries):
	with open('app/assets/data/trellis.json') as data_file:
		return json.dumps(json.load(data_file)[:n_entries])

def make_data_graph(data_list_in):
	idx = 0
	names = collections.OrderedDict()
	for e in data_list_in:
		to = e['to'][:7] # truncate
		fr = e['from'][:7]
		if to not in names:
			names[to] = idx
			idx += 1
		if fr not in names:
			names[fr] = idx
			idx += 1
	edges = [{
				"source": names[e['to'][:7]], 
				"target": names[e['from'][:7]], 
				"value": e['n'], 
				"tags":  [d['tag'] for d in e['data']] 
			} for e in data_list_in
		]
	nodes = [{"name":n} for n in names.keys()]
	return { "nodes": nodes, "edges": edges }

@app.route('/graph', methods=['GET'])
def get_graph():
	with open('app/assets/data/trellis.json') as data_file:
		return json.dumps(make_data_graph(json.load(data_file)))

@app.route('/graph/limit/<int:n_entries>/', methods=['GET'])
def get_graph_limit(n_entries):
	with open('app/assets/data/trellis.json') as data_file:
		return json.dumps(make_data_graph(json.load(data_file)[:n_entries]))


if __name__ == "__main__":
	port = int(os.environ.get("PORT", 5050))
	app.run(host='0.0.0.0', port=port, debug=False)

# set debug=True if you want to have auto-reload on changes
# this is great for developing

