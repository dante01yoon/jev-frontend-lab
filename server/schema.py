"""Finite component contract; model output is data, never executable code."""
from __future__ import annotations
import math

APPS = {
    'stays': {'title': 'Elsewhere', 'subtitle': 'Find a place worth slowing down for.', 'sections': ['filters', 'results', 'compare', 'saved']},
    'analytics': {'title': 'Forma Analytics', 'subtitle': 'A clearer view of your business.', 'sections': ['kpis', 'chart', 'transactions', 'breakdown']},
    'shop': {'title': 'Objects & Co.', 'subtitle': 'Considered objects for everyday living.', 'sections': ['categories', 'products', 'cart', 'benefits']},
    'board': {'title': 'Sprint', 'subtitle': 'Make room for your best work.', 'sections': ['overview', 'filters', 'kanban', 'activity']},
    'inbox': {'title': 'Relay', 'subtitle': 'Every conversation, thoughtfully handled.', 'sections': ['overview', 'filters', 'messages', 'detail']},
    'landing': {'title': 'Flowstate', 'subtitle': 'Less coordination. More meaningful work.', 'sections': ['hero', 'features', 'pricing', 'faq', 'signup']},
}
ENUMS = {
    'theme': ['sand', 'paper', 'midnight', 'mint', 'rose', 'cobalt'],
    'layout': ['editorial', 'sidebar', 'split', 'grid', 'compact', 'showcase'],
    'density': ['comfortable', 'compact'],
    'typography': ['editorial', 'modern', 'mono'],
    'corners': ['soft', 'sharp'],
    'emphasis': ['visual', 'data', 'actions'],
    'hero': ['large', 'small', 'hidden'],
}
FIELDS = {'app', 'title', 'subtitle', 'note', 'sections', *ENUMS}

class ValidationError(ValueError):
    pass


def validate_spec(spec, app=None):
    if not isinstance(spec, dict) or set(spec) != FIELDS:
        raise ValidationError('UISpec must contain exactly the documented fields')
    if not isinstance(spec['app'], str) or spec['app'] not in APPS or (app is not None and app != spec['app']):
        raise ValidationError('UISpec app mismatch')
    for key, choices in ENUMS.items():
        if not isinstance(spec[key], str) or spec[key] not in choices:
            raise ValidationError('Unsupported ' + key)
    for key, limit in [('title', 120), ('subtitle', 240), ('note', 300)]:
        value = spec[key]
        if not isinstance(value, str) or not value.strip() or len(value) > limit or any(ord(c) < 32 and c not in '\n\t' for c in value) or '<' in value or '>' in value:
            raise ValidationError('Invalid plain text ' + key)
    sections = spec['sections']
    allowed = APPS[spec['app']]['sections']
    if not isinstance(sections, list) or not sections or len(sections) > len(allowed):
        raise ValidationError('Expected a non-empty section list')
    if any(not isinstance(s, str) or s not in allowed for s in sections) or len(set(sections)) != len(sections):
        raise ValidationError('Unsupported or duplicate sections')
    return spec


def validate_request(body, refine=False):
    if not isinstance(body, dict):
        raise ValidationError('Expected a JSON object')
    required = {'app', 'prompt', 'plan'} if refine else {'app', 'prompt', 'provider'}
    if not required <= set(body) or set(body) - required - {'previous'}:
        raise ValidationError('Unexpected or missing request fields')
    app = body['app']
    if not isinstance(app, str) or app not in APPS:
        raise ValidationError('Unknown app')
    if not isinstance(body['prompt'], str) or not body['prompt'].strip() or len(body['prompt']) > 1500:
        raise ValidationError('Prompt must contain 1–1500 characters')
    if not refine and body['provider'] not in ['jev', 'laya']:
        raise ValidationError('Unknown provider')
    if 'previous' in body and body['previous'] is not None:
        validate_spec(body['previous'], app)
    if refine and not isinstance(body['plan'], dict):
        raise ValidationError('plan must be the complete response from /api/plan')
    return body


def json_schema(app):
    props = {'app': {'type': 'string', 'enum': [app]}}
    props.update({k: {'type': 'string', 'enum': v} for k, v in ENUMS.items()})
    props.update({k: {'type': 'string'} for k in ['title', 'subtitle', 'note']})
    props['sections'] = {'type': 'array', 'items': {'type': 'string', 'enum': APPS[app]['sections']}}
    return {'type': 'object', 'properties': props, 'required': sorted(FIELDS), 'additionalProperties': False}


def choice(answers, key, options):
    answer = answers.get(key)
    if not isinstance(answer, dict) or answer.get('type') != 'choice' or answer.get('choice') not in options:
        raise ValidationError('Invalid decision for ' + key)
    return answer['choice']


def include_section(answers, key):
    answer = answers.get(key)
    value = answer.get('noul') if isinstance(answer, dict) else None
    if not isinstance(answer, dict) or answer.get('type') != 'noul' or isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not 0 <= value <= 1:
        raise ValidationError('Invalid section probability')
    return value >= 0.5
