import string
import random


def create_id(size=12, chars=string.ascii_uppercase + string.digits):
    return ''.join(random.choice(chars) for x in range(size))

def index_of(iterable, value, get_attr=lambda x:x):
    i = 0
    for item in iterable:
        if get_attr(item) == value:
            return i
        i+= 1
    return None
