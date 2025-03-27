from flask import Blueprint

# Create API blueprint
api_bp = Blueprint('api', __name__, url_prefix='/api')

# Import API routes
from . import auth, users, groups, documents

# Register API routes
def init_app(app):
    app.register_blueprint(api_bp)
