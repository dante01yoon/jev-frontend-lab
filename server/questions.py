"""One shared question builder for both typed-decision models."""
import json
from .schema import APPS, ENUMS, choice, include_section, validate_spec

DESCRIPTIONS = {
    'theme': {'sand': 'warm beige', 'paper': 'white and grey', 'midnight': 'dark navy', 'mint': 'pale green', 'rose': 'warm pink', 'cobalt': 'blue'},
    'layout': {'editorial': 'magazine flow', 'sidebar': 'left controls, right content', 'split': 'two balanced panels', 'grid': 'equal card grid', 'compact': 'dense rows', 'showcase': 'large featured visuals'},
    'density': {'comfortable': 'generous whitespace', 'compact': 'dense content'},
    'typography': {'editorial': 'serif headings', 'modern': 'clean sans serif', 'mono': 'monospace'},
    'corners': {'soft': 'rounded', 'sharp': 'square'},
    'emphasis': {'visual': 'photographs and imagery', 'data': 'numbers and details', 'actions': 'controls and tasks'},
    'hero': {'large': 'large introduction', 'small': 'brief introduction', 'hidden': 'no introduction'},
}
SECTION_DESCRIPTIONS = {
 'filters': 'filter controls', 'results': 'stay results', 'compare': 'selected stay comparison', 'saved': 'saved stays',
 'kpis':'key revenue numbers', 'chart':'revenue trend chart', 'transactions':'transaction table', 'breakdown':'category breakdown',
 'categories':'product category filters', 'products':'product cards', 'cart':'shopping cart', 'benefits':'shop benefits',
 'overview':'summary counts', 'kanban':'task columns', 'activity':'recent task changes',
 'messages':'conversation list', 'detail':'selected conversation detail', 'hero':'product introduction',
 'features':'product features', 'pricing':'plan comparison', 'faq':'frequent questions', 'signup':'signup form',
}


def state_for(body, first=None):
    # Same Unicode text for both models. Previous copy is irrelevant to typed visual choices.
    parts = [f"App: {body['app']}", f"User request: {body['prompt']}"]
    if body.get('previous'):
        p = body['previous']
        parts.append('Previous design: ' + json.dumps({k:p[k] for k in [*ENUMS, 'sections']}, ensure_ascii=False, separators=(',', ':')))
    if first:
        parts.append('Selected design: ' + json.dumps(first, ensure_ascii=False, separators=(',', ':')))
    return '\n'.join(parts)


def qchoice(key):
    return {'type': 'choice', 'instructions': f'Which {key} best matches the user request? Preserve previous if unspecified.', 'criteria': DESCRIPTIONS[key]}


def stage_one(body):
    questions = {key:qchoice(key) for key in ['theme','layout']}
    for section in APPS[body['app']]['sections']:
        questions['section_' + section] = {'type': 'noul', 'instructions': f'Should this screen include {SECTION_DESCRIPTIONS[section]}? Include when requested or normally useful, unless explicitly excluded.'}
    return state_for(body), questions


def first_decisions(body, raw):
    answers = raw.get('answers', {})
    return {**{k:choice(answers, k, ENUMS[k]) for k in ['theme','layout']},
            'sections':[s for s in APPS[body['app']]['sections'] if include_section(answers, 'section_' + s)]}


def stage_two(body, first):
    questions = {key:qchoice(key) for key in ['density','typography','corners','emphasis','hero']}
    # Ordering is also a model decision, not a fixed whole-page preset.
    if len(first['sections']) > 1:
        questions['first_section'] = {'type': 'choice', 'instructions':'Which selected section should appear first in reading order?', 'criteria':{s:SECTION_DESCRIPTIONS[s] for s in first['sections']}}
    return state_for(body, first), questions


def assemble(body, first, raw):
    answers = raw.get('answers', {})
    sections = first['sections'][:]
    if len(sections) > 1:
        first_section = choice(answers, 'first_section', sections)
        sections = [first_section] + [s for s in sections if s != first_section]
    app = APPS[body['app']]
    previous = body.get('previous') or {}
    spec = {'app':body['app'], 'title':previous.get('title', app['title']), 'subtitle':previous.get('subtitle', app['subtitle']),
            **first, **{k:choice(answers,k,ENUMS[k]) for k in ['density','typography','corners','emphasis','hero']},
            'sections':sections, 'note':'Interactive demonstration with synthetic data.'}
    return validate_spec(spec, body['app'])
