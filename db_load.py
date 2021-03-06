# AUTHOR: Ian Wright
# DATE: June 16, 2017

import pandas as pd
from random import random

from sqlalchemy import create_engine
from app import db


# CLEAR EXISTING TABLES AND REBUILD SCHEMA
db.drop_all()
db.create_all()
# ESTABLISH SQLALCHEMY CONNECTION
engine = create_engine('postgresql://localhost/transit')


# FAKE DATA RANGES
datelist = pd.date_range('2016-05-01', periods=60).map(lambda datetime: datetime.date()).tolist() # 60 day range
hourbins = [0, 1, 2] # correspond to 'all', 'peak', 'offpeak'
daybins = [0, 1, 2] # correspond to 'all', 'weekday', 'weekend'
directions = [0, 1] # will ultimately be mapped to real direction headsigns in a separate table (or static directory)
routes = {'B46': [1110, 1111, 1112, 1113, 1114, 1115, 1116, 1117, 1118, 1119, 0], # let '0' represent route-level metrics
          'Bx19': [2220, 2221, 2222, 2223, 2224, 2225, 2226, 2227, 2228, 2229, 0],
          'Bx39': [3330, 3331, 3332, 3333, 3334, 3335, 3336, 3337, 3338, 3339, 0],
          'Q60': [4440, 4441, 4442, 4443, 4444, 4445, 4446, 4447, 4448, 4449, 0],
          'M3': [5550, 5551, 5552, 5553, 5554, 5555, 5556, 5557, 5558, 5559, 0]}


# GENERATE FAKE DATA
ewt_list = []
ejt_list = []

for route in routes:
    for stop in routes[route]:
        for direc in directions:
            rds_index = "_".join([route, str(direc), str(stop)])
            for day in datelist:
                for hbin in hourbins:
                    for dbin in daybins:
                        ewt_metric = round(random() * 10, 1)
                        ejt_metric = round(random() * 10, 1)

                        ewt_row = {'rds_index': rds_index,
                               'date': day,
                               'hourbin': hbin,
                               'daybin': dbin,
                               'metric': ewt_metric}
                        ejt_row = {'rds_index': rds_index,
                               'date': day,
                               'hourbin': hbin,
                               'daybin': dbin,
                               'metric': ejt_metric}

                        ewt_list.append(ewt_row)
                        ejt_list.append(ejt_row)


# WRITE DATA TO POSTGRES
ewt_df = pd.DataFrame(ewt_list, columns=['rds_index', 'date', 'hourbin', 'daybin', 'metric'])
ejt_df = pd.DataFrame(ejt_list, columns=['rds_index', 'date', 'hourbin', 'daybin', 'metric'])

ewt_df.to_sql('ewt', engine, if_exists='append', index=False)
ejt_df.to_sql('ejt', engine, if_exists='append', index=False)
