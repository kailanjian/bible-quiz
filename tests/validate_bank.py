#!/usr/bin/env python3
"""Validate data/questions.json against original_inventory.json. Run: python3 tests/validate_bank.py"""
import json, sys, os
d = os.path.join(os.path.dirname(__file__), '..', 'data')
q = json.load(open(os.path.join(d, 'questions.json')))
inv = json.load(open(os.path.join(d, 'original_inventory.json')))
keys = {'id','original','question','pattern','category','testament','answer','reference','difficulty'}
byid = {x['id']: x for x in q}
errs = []
if len(byid) != len(q): errs.append('duplicate ids')
for x in q:
    if not keys <= set(x) or not x['answer'].strip(): errs.append(f"bad item {x.get('id')}")
for i in inv:
    x = byid.get(i['id'])
    if not x or x['question'] != i['verbatim'] or not x['original']: errs.append(f"original altered/missing {i['id']}")
if sum(x['original'] for x in q) != len(inv): errs.append('original count mismatch')
print(f"{len(q)} questions, {sum(x['original'] for x in q)} originals")
print('\n'.join(errs) or 'OK'); sys.exit(1 if errs else 0)
