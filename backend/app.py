from flask import Flask, request
from flask_cors import CORS
from config import config
import os
import logging

# Enable request logging
logging.basicConfig(level=logging.DEBUG)

def create_app(config_name='default'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # Disable strict slashes to allow routes with or without trailing slashes
    app.url_map.strict_slashes = False
    
    # Initialize CORS
    allowed_origins = [o.strip() for o in os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')]
    CORS(app,
         origins=allowed_origins,
         allow_headers=["Content-Type", "Authorization"],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         supports_credentials=True)
    
    # Ensure upload folder exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Register blueprints
    from routes.auth import auth_bp
    from routes.clients import clients_bp
    from routes.proposals import proposals_bp
    from routes.projects import projects_bp
    from routes.invoices import invoices_bp
    from routes.templates import templates_bp
    from routes.documents_new import documents_bp
    from routes.organization_settings import org_settings_bp
    from routes.client_portal import client_portal_bp
    from routes.notifications import notifications_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(clients_bp, url_prefix='/api/clients')
    app.register_blueprint(proposals_bp, url_prefix='/api/proposals')
    app.register_blueprint(projects_bp, url_prefix='/api/projects')
    app.register_blueprint(invoices_bp, url_prefix='/api/invoices')
    app.register_blueprint(templates_bp, url_prefix='/api/templates')
    app.register_blueprint(documents_bp, url_prefix='/api/documents')
    app.register_blueprint(org_settings_bp, url_prefix='/api/organization')
    app.register_blueprint(client_portal_bp, url_prefix='/api/portal')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    
    # Health check endpoint
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return {'status': 'ok', 'message': 'Backend is running'}, 200
    
    # Request logging middleware - logs EVERY request including 404s
    @app.before_request
    def log_request():
        auth_header = request.headers.get('Authorization', 'None')
        print(f"\n🔥 HIT: {request.method} {request.path}", flush=True)
        if auth_header != 'None':
            print(f"🔑 Auth: {auth_header[:60]}...", flush=True)

    @app.after_request
    def log_response(response):
        print(f"📤 RESPONSE: {response.status_code} for {request.method} {request.path}", flush=True)
        return response
    
    return app

if __name__ == '__main__':
    app = create_app('development')
    app.run(debug=True, port=5000)
