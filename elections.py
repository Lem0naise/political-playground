import random, math, os, numpy, difflib
import poli_sci_kit as psk
from poli_sci_kit import appointment

from time import sleep
import matplotlib.pyplot as mpl
mpl.ion()

DEBUG = False # print debug statements
POLL_COUNTER = 26 # poll times
new_again = False
TOO_FAR_DISTANCE = 190 # 180 Non-voter distance, (Higher number -> More voters) (adjust when add more values)
COALITION_FACTOR = 1.1 # 1.55 Tolerance for coalition partners for Prop Rep (Higher number -> higher chance for coalitions)
TOO_CLOSE_PARTY = 100 # 80 Initial Party Merging (Higher number -> more merging)
RAND_PREF_EFFECT = 0.8 # 0.85 Effect of the random region on voting (lower number / closer to 0 -> more effect)
VOTE_MANDATE = False # mandatory voting

#TODO MAKE THE COALITION GOVERNMENT BASED ON SEATS and NOT PERCENTAGE POINTS


VALUES = [
    "prog_cons",
    "nat_glob",
    "env_eco",
    "soc_cap",
    "est_pop",
    "auth_ana",
    "rel_sec"
]

EVENTS = [ # add negative events i guess?
    "{} performed well in a debate.",
    "{} released a popular policy.",
    "{} received an endorsement from a popular regional leader.",
    "{} gained a major fundraising boost.",
    "{} made a successful campaign stop.",
    "{} was praised by a popular influencer.",
    "{} gained positive media coverage.",
    "{} had a highly effective ad campaign.",
    "{} is engaging well with the youth.",
    "{} secured a key foreign endorsement.",
    "{} received an endorsement from a key newspaper",
    "{} was featured positively in a high-profile interview.",
    "{} successfully countered an attack.",
    "{} won a pivotal local election.",
    "{} made a compelling public appearance.",
    "{} received a high approval rating from a recent poll.",
    "{} successfully resolved a major campaign controversy.",
    "{} received a large donation from a prominent supporter.",
    "{} gained traction in a crucial battleground region.",
    "{} successfully mobilized a large volunteer base.",
    "{} received praise from an influential think tank.",
    "{} was endorsed by an international organisation."
]
class Candidate:
    # -10 -> 10
    # progressive - conservative
    # nationalist - globalist
    # environmentalist - economist
    # socialist - capitalist
    # swing from 
    def __init__(self, id, name, party, party_pop, prog_cons, nat_glob, env_eco, soc_cap, est_pop, auth_ana, rel_sec, colour=None, swing=None):
        self.colour = colour
        self.id = id
        self.name = name
        self.party = party
        self.party_pop = (party_pop)
        self.vals = [prog_cons, nat_glob, env_eco, soc_cap, est_pop, auth_ana, rel_sec]
        self.swing = swing

DESCRIPTORS = {
    "prog_cons": {-100: "very progressive", -30: "progressive", 0: None, 30:"conservative", 100: "ultraconservative"},
    "nat_glob": {-100: "ultranationalist", -30: "nationalist", 0 : None, 30:"globalist", 100: "internationalist"},
    "env_eco": {-100: "environmentalist", 0:None, 50:None,100: "anti-environmentalist"},
    "soc_cap" : {-80: "far-left", -40: "left-wing", -20: "centre-left", 0: "centrist", 20:"centre-right", 100: "corporatist"},
    "est_pop" : {-100: "pacifist", 20:None, 60: "militarist", 100: "ultramilitaristic"},
    "auth_ana" : {-100: "dictatorial", -60: "authoritarian", -10: None, 60:"liberal", 100: "anarchist"},
    "rel_sec": {-100: "theocratic", -30: "religious", 0:None, 70: "secular"},
}

class Voter:
    def __init__(self, vals):
        self.vals = vals

    def vote(self, candidates, rand_pref, cands_length):

        global not_voted
        dists = []
        for i in range(len(candidates)):
            cand = candidates[i]
            euc_sum = 0
            for o in range(len(self.vals)): # sum square of each value
                euc_sum += (self.vals[list(self.vals.keys())[o]] - cand.vals[o])**2
            #euc_dist = math.sqrt(euc_sum) # square root to find euclidean distance
            euc_dist = euc_sum
            euc_dist -= (cand.party_pop*5)**2 # take away party popularity from distance
            if cand.swing: euc_dist -= (cand.swing*5) * abs(cand.swing*5)

            #euc_dist /= ((RESULTS[i][1]+1 / 100000))
            dists.append(euc_dist) # add to distance list


        dists[rand_pref] *= RAND_PREF_EFFECT # 0.85 by random preference of party
        index_min = min(range(len(dists)), key=dists.__getitem__) # find preferred candidate by closest distance
        if (dists[index_min] <= TOO_FAR_DISTANCE**2) or (VOTE_MANDATE): # if close enough to vote for them:
            RESULTS[index_min][1] += 1 # add one to vote count of preferred candidate
        else: # if too radical for any party
            not_voted += 1 # do not vote
        del self



def format_results(results, majority=False):
    if not majority: # if no majority
        return(f"{results[0][0].party} {('(led by ' + results[0][0].name + ')') if (results[0][0].name!='') else ''} won a plurality by a margin of {round((results[0][1]-results[1][1])/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) * 100, 2)}% ({format_votes(results[0][1]-results[1][1])} votes)!")
    else:
        return(f"{results[0][0].party} {('(led by ' + results[0][0].name + ')') if (results[0][0].name!='') else ''} won a plurality by a margin of {round((results[0][1]-results[1][1])/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) * 100, 2)}% ({format_votes(results[0][1]-results[1][1])} votes) with a majority by a margin of {round((results[0][1]/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) - 0.5)*100, 2)}% ({format_votes(results[0][1]-(int(round(VOTING_DEMOS[COUNTRY]['pop']-not_voted)/2)))} votes)!")

def format_votes(votes):
    global scale_factor, scale_fac
    return (f'{abs((votes*scale_factor + (random.randrange(0, int("0" + "9"*scale_fac)) if scale_fac > 1 else 0))):,}')

STORED_RESULTS = None # for the increase or decrease

lim = 20
def print_results(RESULTS, rand_pref, way, mode, rounds = 0):
    global lim
    global STORED_RESULTS

    moves = ["" for _ in RESULTS]
    res = sorted(RESULTS,key=lambda l:l[1], reverse=True) # sort by vote count
    if STORED_RESULTS: # once have a board already printed

        cands = [x[0] for x in res]
        for x in range(len(res)):
            change = STORED_RESULTS.index(res[x]) - x
            moves[x] = "▴" if change>0 else ("▾" if change < 0 else "")
        for x in range(len(STORED_RESULTS)): # adding to plot values
            new = STORED_RESULTS[x][0]
            dat = STORED_RESULTS[x][1]
            # get percentage of vote for line graph
            dat = round((dat)/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) * 100, 2)
            ys[new].append(dat);
        ys_values = list(ys.values())
        ys_keys = list(ys.keys())


        mpl.cla() # clear old data and legends
        #print(ys_values)
        order = []

        for x in range(len(ys_values)): # for each candidate, plot their line
            # add to the order for the legend ordering
            if x==0: # add the first percentage index before starting
                order.append(x) #first percentage
            else:
                n = ys_values[x][-1] # n is the currently iterated and not yet added
                for i in range(len(order)): # go through the order list until found a bigger score
                    past = ys_values[order[i]][-1] # currently iterated score in the order list
                    if (n > past):
                        order.insert(i, x)
                        break
                    elif i+1 == len(order): # if reached the end
                        order.append(x)


        total = 0
        for x in ys_values: # going through all candidates
            total+=x[-1]


        ys_values_sorted = [x[-1] for x in ys_values] # get last value of each y_value
        ys_values_sorted.sort()
        p = ys_values_sorted[-1] # biggest current vote
        if (p/total * 100) > 50: # if anyone is getting above 50% currently
            if 100>lim:
                lim = 100;
        elif (p/total * 100) > 20:
            if 60>lim:
                lim = 60;
        else:
            if 20>lim:
                lim = 20;
        mpl.ylim(0, lim)

        for x in range(len(ys_values)): # for each candidate
            #(ys_values[x][-1]) si their most recent election poll result

            v = ys_values[x][-1] # debug (the counterpart to the removable section)

            const_value = 10 # this increases the random jumping up and down in the polls
            if mode == "PROP REP":
                const_value = 11 # make it higher for prop rep as party_pop is reduced
            ys_values[x][-1] += (random.random()-0.5)*0.2 * (cands[x].party_pop/10) * way*const_value # TODO REMOVE THIS IS A RANDOM TO MAKE COOL PATTERNS IDEK LMFAO

            if ys_values[x][-1] < 0: ys_values[x][-1] = 0 # reset to 0 to prevent negative


            ys_values[x][-1] = (ys_values[x][-1] / total) * 100 # making percentage out of current total

            v = ys_values[x][-1] # !!!!! debug: remove to change the percentage label NOT out of current total

            #v = ys_values[x][-1] # TODO REMOVE - this changes the percentage from overall to current on label
            lab = str.rjust(str.ljust(str(round(v, 2)) + "%", 8), 4, '0') # pad string of voting percentages

            if ys_keys[x].colour: # if set colour
                # TODO
                if mode == "PROP REP" : mpl.plot(ys_values[x], ys_keys[x].colour, label= lab + ys_keys[x].party + ((" - !MAJORITY!" if v>50 else (" - !PREDICTED WINNING!" if (ys_values[x][-1] > 50) else "")))) # legend label
                elif mode == "RUNOFF": 
                    mpl.plot(ys_values[x], ys_keys[x].colour, label= lab + ys_keys[x].name.split('/')[0] + " - " + ys_keys[x].party) # legend label
            else: # if no colour
                if mode == "PROP REP" : mpl.plot(ys_values[x], label= lab + ys_keys[x].party + ((" - !MAJORITY!" if v>50 else (" - !PREDICTED WINNING!" if (ys_values[x][-1] > 50) else "")))) # legend label
                elif mode == "RUNOFF": 
                    mpl.plot(ys_values[x], label= lab + ys_keys[x].name.split('/')[0] + " - "+ ys_keys[x].party) # legend label

                #mpl.plot(ys_values[x], label= lab + ys_keys[x].party + (" - !WON!" if v>50 else "")) # legend label


        #reverse list of orders (because top down for percentage)
        handles, labels = mpl.gca().get_legend_handles_labels()
        mpl.legend([handles[idx] for idx in order],[labels[idx] for idx in order], loc="upper left", prop={'family': 'monospace'}) #order the legend
        #mpl.xticks([x/len(ys_values[0]) for x in range(len(ys_values[0]))]) (trying to get ticks on the x axis)
        #mpl.title((COUNTRY + " Election Polling").title().ljust(20) + str.rjust(str.ljust(str(round(total, 2)) + "%", 8), 4, '0'))
        mpl.title((COUNTRY + " Election Polling - ").title().ljust(20) + str.rjust(str.ljust(str(round((100-total)/3)) + " weeks until Election Day", 8), 4, '0'))
        mpl.pause(1e-10)

    #os.system('cls' if os.name == 'nt' else 'clear')

    #print(COUNTRY + " - " + mode + "\n")
    #for i in range(len(res)):
    #    # {str.ljust(('▴' if i == rand_pref else ''), 2)}
    #    print(f"{str.ljust(res[i][0].name, 20)} {str.ljust(moves[i], 1)}{str.ljust(res[i][0].party, 20)} : {str.ljust(str(round(res[i][1]/(VOTING_DEMOS[COUNTRY]['pop']-not_voted)*100, 2))+'%', 8)} : {format_votes(res[i][1])} votes " )
    #print()
    #print(f"{str.ljust('Not voted', 53)} : {format_votes(not_voted)}")
    #print()

    STORED_RESULTS = res

def print_final_results(RESULTS, first=True, old_res = [], rand_pref=None, way=None):
    mpl.pause(0.5)
    print_results(RESULTS, rand_pref, way, mode)
    mpl.pause(0.5)

    global STORED_RESULTS
    STORED_RESULTS = None
    res = sorted(RESULTS,key=lambda l:l[1], reverse=True) # sort by vote count
    os.system('cls' if os.name == 'nt' else 'clear')
    print(COUNTRY + " - " + mode + "\n")
    for i in range(len(res)):
        if not first: # print with the percentage change
            print(f"{str.ljust(res[i][0].name.split('/')[0].strip(), 20)[:20]} {str.ljust(res[i][0].party, 20)[:20]} : {str.ljust(str(round(res[i][1]/(VOTING_DEMOS[COUNTRY]['pop']-not_voted)*100, 2))+'%', 6)}{str.ljust(('[▴' if (res[i][1]-old_res[res[i][0]])/(VOTING_DEMOS[COUNTRY]['pop']-not_voted)>0 else '[▾') + str(round(abs(res[i][1]-old_res[res[i][0]])/(VOTING_DEMOS[COUNTRY]['pop']-not_voted)*100, 2)) + '%]', 10)}: {format_votes(res[i][1])} votes " )
        else:
            print(f"{str.ljust(res[i][0].name.split('/')[0].strip(), 20)[:20]} {str.ljust(res[i][0].party, 20)[:20]} : {str.ljust(str(round(res[i][1]/(VOTING_DEMOS[COUNTRY]['pop']-not_voted)*100, 2))+'%', 6)}: {format_votes(res[i][1])} votes " )
    print()
    print()
    print(f"{str.ljust('Turnout', 52)} : {round((VOTING_DEMOS[COUNTRY]['pop']-not_voted) / (VOTING_DEMOS[COUNTRY]['pop']) * 100, 1)}%")
    print(f"{str.ljust('Not voted', 52)} : {format_votes(not_voted)}")
    print()

regions = []
def run(data, cands, pop, r_count =0 ):
    global regions
    global lim
    lim = 20
    mpl.rcParams["figure.figsize"] = [7, 10]
    mpl.rcParams["figure.autolayout"] = True
    mpl.rcParams['font.family'] = 'monospace'
    mpl.tick_params(axis='y', which='both', labelleft=False, labelright=True, left=False, right=True)
    mpl.tick_params(axis='x', which='both', labelbottom=False, bottom=False)

    rand_pref = 0
    cand_numbers = []
    REGION_NUMBER = 30 # increase this number to INCREASE the randomness / district - > more realistic patterns but slower (too many districts means pure randomness of elections)
    if new_again:
        REGION_NUMBER = 40

    # 20 is a good number
    for x in range(len(cands)):
        #pop = cands[x].party_pop
        #pop = 0
        #if pop==0:
        #    pop = 10 # default pop if not the same country
        for _ in range(REGION_NUMBER):
            cand_numbers.append(x)

    # each voter number at which the region (random preference) changes
    regions = [] # must be length of cand_numbers - 1
    factor = pop // len(cand_numbers) # round factor
    factor * len(cand_numbers) # estimate of population

    for i in range(len(cand_numbers)):
        regions.append(factor*i)
    #print(cand_numbers)

    cands_length = len(cands)
    for it in range(1, pop): # population in tens of thousands ! must optimize

        vot = Voter(VOTING_DEMOS[COUNTRY]["vals"])

        # setting voter values from massive dataset
        for i in range(len(vot.vals)):
            vot.vals[list(vot.vals.keys())[i]] = data[i][it] # go through each data set from leftmost to rightmost
            if vot.vals[list(vot.vals.keys())[i]] >= 100:
                vot.vals[list(vot.vals.keys())[i]] = 100
            if vot.vals[list(vot.vals.keys())[i]] <= -100:
                vot.vals[list(vot.vals.keys())[i]] = -100

        vot.vote(cands, rand_pref, cands_length) # calling vote

        # showing results
        # wait til 4% of the polling is done before showing, makes nicer diagrams
        if (it/pop) > 0.04 and it % (pop//(POLL_COUNTER) + 1) == 0:
            
            print_results(RESULTS, rand_pref, it/pop, mode, r_count)
            sleep(DELAY)

        if it in regions:
            # pick a new region
            cand_numbers.pop(cand_numbers.index(rand_pref))
            if len(cand_numbers) != 0:
                random.seed() # seeding to make a proper random choice
                rand_pref = random.choice(cand_numbers)
                
            # something good TODO
            if random.random() < (0.01 + (21-len(cands))/201): print("~ " + random.choice(EVENTS).replace('{}', ((cands[rand_pref].name.split('/')[0].strip() if random.random() > 0.3  else cands[rand_pref].party) if mode=="RUNOFF" else cands[rand_pref].party)))

    print_final_results(RESULTS, rand_pref=rand_pref, way=it/pop)
    return sorted(RESULTS,key=lambda l:l[1], reverse=True) # sort by vote count



first_leader = None
first_partners = None
def coalition(leader, results_a):
    global first_leader
    global first_partners
    results = sorted(results_a ,key=lambda l:l[1], reverse=True) # sort results
    parties_in_order = [x[0] for x in results] # does not change
    new_leader = leader # set the leader variable

    # list of percentages DOES NOT CHANGE
    percs = [(results[x][1]/(VOTING_DEMOS[COUNTRY]['pop']-not_voted)) for x in range(len(parties_in_order))]
    perc = results[0][1]/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) # current leader percentage

    # DOES CHANGE
    majority = False
    counter = 0
    first_perc = True
    while not majority:

        dists = []
        for i in range(len(parties_in_order)): # finding closest ideological party
            part = parties_in_order[i]

            euc_sum = 0
            for o in range(len(new_leader.vals)): # sum square of each value
                if (new_leader.vals[o] >0 and part.vals[o] < 0) or (new_leader.vals[0] < 0 and part.vals[0] > 0): # if any values are the other side of the spectrum
                    #print(VALUES[o])
                    #print(new_leader.party, part.party)
                    #input()
                    euc_sum += 4200 # they should have more effect (treat as if another ~60^2 difference) flipped values more effect
                    #print(f'the {VALUES[o]} is flipped for {new_leader.party} and {part.party}, adding {2200} ')
                    if VALUES[o] == "soc_cap" : euc_sum += 1000 # add more if it is capitalist / socialist flip
                    #print(f'Capitalist / socialist, adding another 500')
                euc_sum += (new_leader.vals[o] - part.vals[o])**2
                #input(euc_sum)
            euc_dist = math.sqrt(euc_sum) # square root to find euclidean distance
            if euc_dist != 0: # if not same party
                #euc_dist += part.party_pop*5 # add party popularity from distance (prefer smaller parties)
                #print(euc_dist, euc_dist+percs[i]*50,"")
                euc_dist += percs[i]*150 # add party vote from distance (prefer less voted parties)
                pass
            dists.append(euc_dist) # add to distance list

        # calculating from distance which partners to have
        partners = []
        cur_dists = dists
        #print(dists)
        #print([x.party for x in parties_in_order])
        input()

        cohesion = 1 # cohesion as a percentage of coalition

        while perc < 0.49: # while do not have a majority go through the list of parties:

            index_min = min(range(len(cur_dists)), key=dists.__getitem__) # find preferred candidate by closest distance
            if DEBUG: print(f"DEBUG: {cur_dists[index_min] - TOO_FAR_DISTANCE*COALITION_FACTOR}")
            if cur_dists[index_min] > (TOO_FAR_DISTANCE*COALITION_FACTOR): # if there is no party willing to form a coalition
 
                # reset the leader to the second place candidate
                print(f"\n{new_leader.party} is in negotiations with {parties_in_order[index_min].party}...")
                sleep(0.5)
                print(f"Negotiations have broken down.")
                if first_perc:
                    first_leader = new_leader
                    first_partners = partners
                    first_perc = False
                sleep(1)
                counter += 1
                if counter >= len(parties_in_order): # if no coalition has been formed
                    return (new_leader, [])
                new_leader = parties_in_order[counter]
                perc = results[counter][1]/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) # current leader percentage (test)
                cur_dists = dists # reset the distances back to original
                break

            if cur_dists[index_min] == 0: # if it is the leader already
                cur_dists[index_min] = 99999
            else: # if found a good new coalition partner
                print(f"\n{new_leader.party} is in negotiations with {parties_in_order[index_min].party}...")
                sleep(1)

                # the partner vetting all the preexisting partners and their relationships with them
                partner = parties_in_order[index_min]
                t_dists = []
                for part in partners:
                    euc_sum = 0
                    for o in range(len(partner.vals)): # sum square of each value
                        euc_sum += (partner.vals[o] - part.vals[o])**2
                    euc_dist = math.sqrt(euc_sum) # square root to find euclidean distance
                    t_dists.append(euc_dist) # add to distance list
                #t_dists.sort() do NOT do

                if len(t_dists) > 0 and t_dists[-1] > TOO_FAR_DISTANCE*COALITION_FACTOR: # if any other partner is over the too far distance
                    t_dists, t_partners = (list(t) for t in zip(*sorted(zip(t_dists, partners))))
                    print(f'{t_partners[-1].party} refuses to form a coalition with {partner.party} in.')
                    cur_dists[index_min] = 999999 # already partnered with so remove from list
                else: # if satisfied
                    if len(t_dists)>0:
                        #print(t_dists[-1])
                        #print(TOO_FAR_DISTANCE*COALITION_FACTOR)
                        #print()
                        #input()
                        pass
                    partners.append(partner)
                    print(f'{partner.party} joined the coalition of {new_leader.party}.')
                    cur_dists[index_min] = 999999 # already partnered with so remove from list
                    perc += percs[index_min]
                input("[...Continue...]")

            os.system('cls' if os.name == 'nt' else 'clear') # clear and then ask
            print(f"Current Coalition Vote Percentage: {round(perc*100, 1)}%")
            print(f"Current Coalition Leader: {new_leader.party}")
            print(f"Members: ")
            for x in partners:
                print(f"> {x.party}")
            sleep(0.5)
        if perc > 0.49:
            majority = True

    sleep(1)
    return (new_leader, partners)



# ~~~~~~~~~~ CUSTOM USER COUNTRIES ~~~~~~~~~~~~

VOTING_DEMOS = {
    #COUNTRY: [pop in hundreds]
    "UK": {"pop": 70_029, "vals": {
                "prog_cons": 10,
                "nat_glob": -15,
                "env_eco": 65,
                "soc_cap":  25,
                "est_pop": -24,
                "auth_ana": -17,
                "rel_sec": -23},
                "scale":1000,
                "hos":"King Charles III"},

    "MEXICO": {"pop": 127_70, "vals": {
                "prog_cons": 5,
                "nat_glob": -5,
                "env_eco": 35,
                "soc_cap":  5,
                "est_pop": 14,
                "auth_ana": -17,
                "rel_sec": 23},
                "scale":10000,
                "hos":"Manuel Lopez Obrador"},
    "GERMANY 1936": {"pop": 61_024, "vals":{
                "prog_cons": 95,
                "nat_glob": -68,
                "env_eco": 64,
                "soc_cap":  4,
                "est_pop": 78,
                "auth_ana": -56,
                "rel_sec": -56},
                "scale":1000,
                "hos":"Paul von Hindenburg"},
    "GERMANY" : {"pop" : 85_029, "vals" : {
                "prog_cons": -12,
                "nat_glob": 34,
                "env_eco": 24,
                "soc_cap":  12,
                "est_pop": 24,
                "auth_ana": -1,
                "rel_sec": -12},
                "scale":1000,
                "hos":"Frank-Walter Steinmeier"},
    "HAMPTON": {"pop": 1_546, "vals": {
                "prog_cons": 21,
                "nat_glob": 0,
                "env_eco": -12,
                "soc_cap":  52,
                "est_pop": -23,
                "auth_ana": -30,
                "rel_sec": 29},
                "scale":1,
                "hos":"Kevin Knibbs"},
    "DENMARK": {"pop": 50_843, "vals": {
                "prog_cons": -34,
                "nat_glob": 36,
                "env_eco": 0,
                "soc_cap":  -2,
                "est_pop": -21,
                "auth_ana": 32,
                "rel_sec": 44},
                "scale":100,
                "hos":"Frank-Walter Steinmeier"},
    "BELGIUM": {"pop": 11_843, "vals": {
            "prog_cons": 1,
            "nat_glob": 6,
            "env_eco": 0,
            "soc_cap":  -2,
            "est_pop": 2,
            "auth_ana": 2,
            "rel_sec": 4},
            "scale":100,
            "hos":"Frank-Walter Steinmeier"},
    "NORTH KOREA": {"pop": 25_083, "vals" : {
                "prog_cons": 56,
                "nat_glob": -130,
                "env_eco": 35,
                "soc_cap":  -125,
                "est_pop": 85,
                "auth_ana": -98,
                "rel_sec": 99},
                "scale":1000},
    "SOVIET UNION 1925": {"pop": 230_83, "vals" : {
                "prog_cons": 26,
                "nat_glob": -53,
                "env_eco": 35,
                "soc_cap":  -71,
                "est_pop": 81,
                "auth_ana": -58,
                "rel_sec": 71},
                "scale":10000},
    "SOVIET UNION 1991": {"pop": 230_83, "vals" : {
                "prog_cons": 46,
                "nat_glob": 13,
                "env_eco": 35,
                "soc_cap":  -41,
                "est_pop": 50,
                "auth_ana": -38,
                "rel_sec": 71},
                "scale":10000},
    "USA" : {"pop": 350_00, "vals" : {
                "prog_cons": 10,
                "nat_glob": -5,
                "env_eco": 20,
                "soc_cap":  50,
                "est_pop": 30,
                "auth_ana": -12,
                "rel_sec": -31},
                "scale":10000,
                "hos":"Chief Justice John Roberts"},
    "TURKEY" : {"pop": 87_000, "vals" : {
                "prog_cons": 38,
                "nat_glob": -24,
                "env_eco": 21,
                "soc_cap":  65,
                "est_pop": 34,
                "auth_ana": -12,
                "rel_sec": 2},
                "scale":1000},
    "FINLAND" : {"pop": 55_410, "vals" : {
                "prog_cons": -2,
                "nat_glob": 10,
                "env_eco": 12,
                "soc_cap":  -1,
                "est_pop": 12,
                "auth_ana": 12,
                "rel_sec": 45},
                "scale":100,
                "hos":"Sauli Niinosto"},
    "UKRAINE" : {"pop": 38_410, "vals" : {
                "prog_cons": -5,
                "nat_glob": 10,
                "env_eco": 1,
                "soc_cap":  -1,
                "est_pop": 22,
                "auth_ana": 12,
                "rel_sec": -15},
                "scale":1000,
                "hos":"Zelenskyy"},
    "RUSSIA" : {"pop": 143_00, "vals": {
                "prog_cons": 43,
                "nat_glob": -62,
                "env_eco": 71,
                "soc_cap":  0,
                "est_pop": -45,
                "auth_ana": -61,
                "rel_sec": -31},
                "scale":10000,
                "hos":"Vladimir Putin"},
    "SOMALIA" : {"pop" : 17_000, "vals": {
                "prog_cons": 76,
                "nat_glob": -46,
                "env_eco": 19,
                "soc_cap":  -15,
                "est_pop": 89,
                "auth_ana": -17,
                "rel_sec": -64},
                "scale":1000},
    "IRELAND" : {"pop": 60_12, "vals": {
                "prog_cons": 5,
                "nat_glob": -1,
                "env_eco": 32,
                "soc_cap":  14,
                "est_pop": 12,
                "auth_ana": -4,
                "rel_sec": -41},
                "scale":1000,
                "hos":"Michael Higgins"},
    "AUSTRIA" : {"pop": 9_212, "vals": {
            "prog_cons": 25,
            "nat_glob": -16,
            "env_eco": 2,
            "soc_cap":  54,
            "est_pop": 0,
            "auth_ana": -4,
            "rel_sec": -32},
            "scale":1000,
            "hos":"Alexander van der Bellen"},
    "FRANCE" : {"pop": 67_212, "vals": {
            "prog_cons": 25,
            "nat_glob": -26,
            "env_eco": 2,
            "soc_cap":  0,
            "est_pop": 32,
            "auth_ana": -12,
            "rel_sec": 0},
            "scale":1000,},
    "EU" : {"pop": 44_812, "vals": {
            "prog_cons": 12,
            "nat_glob": 3,
            "env_eco": 2,
            "soc_cap":  22,
            "est_pop": 2,
            "auth_ana": -3,
            "rel_sec": -1},
            "scale":10000,},
    "SPAIN" : {"pop": 47_421, "vals": {
            "prog_cons": 5,
            "nat_glob": 1,
            "env_eco": 3,
            "soc_cap":  2,
            "est_pop": -5,
            "auth_ana": -4,
            "rel_sec": 2},
            "scale":1000,},
    "KRESIMIRIA" : {"pop": 80_21, "vals": {
            "prog_cons": 25,
            "nat_glob": 26,
            "env_eco": -23,
            "soc_cap":  -12,
            "est_pop": 51,
            "auth_ana": -32,
            "rel_sec": -90},
            "scale":10000,},
    "SORDLAND" : {"pop": 35_12, "vals": {
            "prog_cons": 33,
            "nat_glob": -5,
            "env_eco": 12,
            "soc_cap":  -5,
            "est_pop": 22,
            "auth_ana": -4,
            "rel_sec": -4},
            "scale":10000,
            "hos":"General Iosef Lancea"},
    "ALBANIA" : {"pop": 27_12, "vals": {
            "prog_cons": 0,
            "nat_glob": 25,
            "env_eco": 10,
            "soc_cap":  -15,
            "est_pop": -22,
            "auth_ana": 2,
            "rel_sec": -15},
            "scale":1000,
            "hos":"General Iosef Lancea"},
}


# def main(); 

def intro():
    print("\n>Welcome to the Electoral Simulator.")
    print("I'm Indigo and here's how to use the Simulator:")
    print("When you click enter to continue, the Simulator will start.")
    print("\n>You will first pick a country from where to get the voting demographics and population.")
    print("Then you will pick a list of parties from a country, not necessarily the same country.")
    print("You can combine lists by using the + symbol; ie, France+Spain+Poland.")
    print("\n>While setting up, you will be asked which settings you want, eg delay and number of polls.")
    print("There will be a range of allowed values in round brackets () and a default value in square brackets [].")
    print("If you enter nothing, the default value will be used.")
    input("\n[...Continue...]")

intro()

for x in VOTING_DEMOS.keys():
    print(x)
COUNTRY = difflib.get_close_matches(input("\nPick a country from the list: ").upper().strip(), VOTING_DEMOS.keys(), 1)[0] # get closest country
# SETTING SCALE FACTOR FOR COUNTRY POPULATION
scale_factor = VOTING_DEMOS[COUNTRY]["scale"] # from population to real population
scale_fac = len(str(scale_factor))-1

# SLIGHTLY RANDOMIZING VOTING DEMOGRAPHIC
for p in range(len(VOTING_DEMOS[COUNTRY])):
   #VOTING_DEMOS[COUNTRY]["vals"][VOTING_DEMOS[COUNTRY]["vals"].keys()[p]]
    VOTING_DEMOS[COUNTRY]["vals"][list(VOTING_DEMOS[COUNTRY]["vals"].keys())[p]] += round(10*(random.random()-0.5)) # randomise by 5 possibility each side


# ~~~~~~~~~~ CUSTOM USER PARTIES ~~~~~~~~~~~~

# progressive-conservative, nationalist-globalist, environmentalist-economical, socialist-capitalist, pacifist-militarist, authoritation - anarchist
# the first number does not matter at all
# party popularity is from 1 to 10

CAND_LIST = {
    "UK": [
        Candidate(0, "Rishi Sunak", "Conservatives", 10, 
            prog_cons = 60,
            nat_glob = -34,
            env_eco = 66,
            soc_cap =  61,
            est_pop= -20,
            auth_ana= -21,
            rel_sec = 1,
            colour="blue"),
        Candidate(1, "Ed Davey", "Liberal Democrats",0.1,
            prog_cons = -35,
            nat_glob = 31,
            env_eco = 12,
            soc_cap =  45,
            est_pop= 0,
            auth_ana= 33,
            rel_sec = 32,
            colour="gold"),
        Candidate(2, "Keir Starmer", "Labour", 10, 
            prog_cons = -5,
            nat_glob = 41,
            env_eco = -11,
            soc_cap =  14,
            est_pop= 4,
            auth_ana= -1,
            rel_sec = 74,
            colour="red"),
        Candidate(3, "Carla Denyer", "Green Party", 0.1, 
            prog_cons = -37,
            nat_glob = 31,
            env_eco = -64,
            soc_cap =  -31,
            est_pop= -10,
            auth_ana= 31,
            rel_sec = 13,
            colour="green"),
        Candidate(4, "Nigel Farage", "Reform Party", 0.1, 
            prog_cons = 90,
            nat_glob = -90,
            env_eco = 65,
            soc_cap =  80,
            est_pop= 90,
            auth_ana=-42,
            rel_sec = -3,
            colour="black")
    ],
    "US PRIMARIES": [
        Candidate(0, "Donald Trump", "Donald Trump", 10,
                colour = "red",
                prog_cons = 60,
                nat_glob = -40,
                env_eco = 40,
                soc_cap =  95,
                est_pop= 40,
                auth_ana= -63,
                rel_sec = -12),
        Candidate(1, "Ron DeSantis", "Ron DeSantis", 10,
                colour = "blue",
                prog_cons = 80,
                nat_glob = -50,
                env_eco = 50,
                soc_cap =  95,
                est_pop= 60,
                auth_ana= -73,
                rel_sec = -52),
        Candidate(1, "Nikki Haley", "Nikki Haley", 10,
                colour = "yellow",
                prog_cons = 40,
                nat_glob = -30,
                env_eco = 40,
                soc_cap =  95,
                est_pop= 30,
                auth_ana= -53,
                rel_sec = -2),
        Candidate(1, "Chris Christie", "Chris Christie", 10,
                colour = "green",
                prog_cons = 40,
                nat_glob = -30,
                env_eco = 50,
                soc_cap =  75,
                est_pop= 30,
                auth_ana= -33,
                rel_sec = -62),
    ],
    "USA": [
        Candidate(0, "Donald Trump", "Republican Party", 10,
                colour = "red",
                prog_cons = 60,
                nat_glob = -40,
                env_eco = 40,
                soc_cap =  95,
                est_pop= 40,
                auth_ana= -63,
                rel_sec = -12),
        Candidate(1, "Joe Biden", "Democratic Party", 10,
                colour = "blue",
                prog_cons = -10,
                nat_glob = 42,
                env_eco = 20,
                soc_cap = 48,
                est_pop= 10,
                auth_ana= -2,
                rel_sec = 3),
        Candidate(2, "Jo Jorgensen", "Libertarian Party", 0.1,
                colour = "orange",
                prog_cons = 30,
                nat_glob = -71,
                env_eco = 90,
                soc_cap = 90,
                est_pop= 10,
                auth_ana= 72,
                rel_sec = 4),
        Candidate(2, "Joe Sims", "CPUSA", 0.05,
                colour = "red",
                prog_cons = -30,
                nat_glob = -40,
                env_eco = -10,
                soc_cap = -90,
                est_pop= 40,
                auth_ana= -72,
                rel_sec = 76),
        Candidate(3, "Howie Hawkins", "Green Party of USA", 0.01, -40, 35, -85, -10, -50, -21, 65, "green"),
    ],
    "GERMANY 1936": [
        Candidate(0, "Otto Braun", "SPD", 7, 12, -35, 24, -21, 36, 4, 12),
        Candidate(1, "Adolf Hitler", "NDSAP", 7, 150, -78, -1, 45, 86, -86, -45),
        Candidate(3, "Ernst Thälmann", "KPD", 7, 57, -56, 24, -77, 78, 23, 41),
        Candidate(0, "Heinrich Brüning", "Zentrum", 7, 0, -12, 41, 12, 6, -12, 13),
    ],
    "NORTH KOREA": [
        Candidate(0, "Kim Jong-Un", "Workers' Party of Korea", 11, 59, -130, 23, -105, 90, -99, 100),
        Candidate(1, "Ri Myong-Chol", "Chondoist Party", 0.1, -20, -20, -30, -20, 10, -22, 40)
    ],
    "FINLAND" : [
        Candidate(0, "Antti Lindtman", "Social Democratic Party", 10, -30, 20, -12, -12, -1, -10, 51),
        Candidate(1, "Annika Saarikko", "Centre Party", 9, 0, 2, 15, 10, -10, -31, 12),
        Candidate(2, "Sofia Virta", "Green League", 1, -67, 75, 40, 0, -10, 1, 73),
        Candidate(3, "Li Andersson", "Left Alliance", 4, -30, 0, 10, -60, 0, -1, 68),
        Candidate(4, "Petteri Orpo", "National Coalition", 4, 34, 30, 40, 75, 10, -45, -14),
        Candidate(5, "Riikka Purra", "Finns Party", 4, 68, -30, 20, 60, 49, -79, -15),
    ],
    "RUSSIA" : [
        Candidate(8, "Vladimir Putin", "United Russia", 20,
                prog_cons= 55,
                nat_glob= -60,
                env_eco= 32,
                soc_cap= 12,
                est_pop= -65,
                auth_ana= -65,
                rel_sec = -50,
                colour='blue'),
        Candidate(6, "Gennady Zyuganov", "Communist Party of Russia", 4,
                prog_cons= 34,
                nat_glob= -12,
                env_eco= 0,
                soc_cap= -95,
                est_pop=  -45,
                auth_ana= -94,
                rel_sec = 87,
                colour="red"),
        Candidate(6, "Sergey Mironov", "A Just Russia", 1,
                prog_cons= 34,
                nat_glob= -12,
                env_eco= 45,
                soc_cap= 12,
                est_pop=  15,
                auth_ana= -74,
                rel_sec = 12),
        Candidate(6, "Leonid Slutsky", "Liberal Democrats", 1,
                prog_cons= 85,
                nat_glob= -97,
                env_eco= 63,
                soc_cap= 0,
                est_pop= 84,
                auth_ana= -74,
                rel_sec = -89),
    ],
    "DENMARK" : [
        Candidate(8, "Mette Frederiksen", "Social Democrats", 10, # social democracy
                prog_cons= -25,
                nat_glob= 20,
                env_eco= -2,
                soc_cap= -10,
                est_pop=  5,
                auth_ana= 5,
                rel_sec = 0,
                colour='red'),
        Candidate(6, "Troels Lund Poulsen", "Venstre", 4, # conservative liberalism
                prog_cons= 34,
                nat_glob= 32,
                env_eco= 13,
                soc_cap= 35,
                est_pop=  15,
                auth_ana= -14,
                rel_sec = 7,
                colour="blue"),
        Candidate(6, "Lars Lokke Rasmussen", "Moderates", 1, # liberalism
                prog_cons= 4,
                nat_glob= 32,
                env_eco= 45,
                soc_cap= 32,
                est_pop=  45,
                auth_ana= -4,
                rel_sec = 22,
                colour="purple"),
        Candidate(6, "Pia Olsen Dyhr", "Green Left", 1, # democratic socialists
                prog_cons= -45,
                nat_glob= -97,
                env_eco= -29,
                soc_cap= -41,
                est_pop=  -24,
                auth_ana= 19,
                rel_sec = 21,
                colour="green"),
        Candidate(8, "Inger Stojberg", "The Denmark Democrats", 10,
             prog_cons= 75,
                nat_glob= -70,
                env_eco= 32,
                soc_cap= 2,
                est_pop= 61,
                auth_ana= -31,
                rel_sec = -40,
                colour='black'),
    ],
    "CANADA" : [
        Candidate(8, "Justin Trudeau", "Liberal Party", 10, # social democracy
                prog_cons= -25,
                nat_glob= 30,
                env_eco= 12,
                soc_cap= 10,
                est_pop=  5,
                auth_ana= 5,
                rel_sec = 0,
                colour='red',
                swing=-5),
        Candidate(6, "Pierre Poilievre", "Conservative Party", 10, # conservative liberalism
                prog_cons= 34,
                nat_glob= 2,
                env_eco= 13,
                soc_cap= 35,
                est_pop=  25,
                auth_ana= -14,
                rel_sec = -8,
                colour="blue",
                swing=10),
        Candidate(6, "Yves-Francois Blanchet", "Bloc Quebecois", 0.3, # nationalism
                prog_cons= 4,
                nat_glob= -32,
                env_eco= 45,
                soc_cap= -22,
                est_pop=  25,
                auth_ana= 41,
                rel_sec = 0,
                colour="turquoise",
                swing=-5),
        Candidate(6, "Jagmeet Singh", "New Democratic Party", 2, # democratic socialists
                prog_cons= -45,
                nat_glob= 31,
                env_eco= -29,
                soc_cap= -31,
                est_pop=  -24,
                auth_ana= 19,
                rel_sec = 21,
                colour="orange"),
    ],
    "LATVIA" : [
        Candidate(8, "Krišjānis Kariņš", "New Unity", 10, # social democracy
                prog_cons= 5,
                nat_glob= 30,
                env_eco= 22,
                soc_cap= 40,
                est_pop=  5,
                auth_ana= 5,
                rel_sec = 0,
                colour='springgreen'
                ),
        Candidate(6, "Aivars Lembergs", "ZZS", 10, # conservative liberalism
                prog_cons= 34,
                nat_glob= 2,
                env_eco= -23,
                soc_cap= 35,
                est_pop=  5,
                auth_ana= 4,
                rel_sec = -8,
                colour="green"),
        Candidate(6, "Raivis Dzintars", "National Alliance", 5, # nationalism
                prog_cons= 61,
                nat_glob= -52,
                env_eco= 25,
                soc_cap= 2,
                est_pop=  25,
                auth_ana= -31,
                rel_sec = -1,
                colour="red"),
        Candidate(6, "Kaspars Briskens", "The Progressives", 5, # democratic socialists
                prog_cons= -35,
                nat_glob= 31,
                env_eco= 3,
                soc_cap= 5,
                est_pop=  4,
                auth_ana= 2,
                rel_sec =21,
                colour="orange"),
        Candidate(6, "Ainārs Šlesers", "Latvia First", 2, # ultranationalist
                prog_cons= 85,
                nat_glob= -61,
                env_eco= 59,
                soc_cap= -31,
                est_pop=  -24,
                auth_ana= -49,
                rel_sec = -21,
                colour="lightcoral"),
    ],
    "ALBANIA" : [
        Candidate(8, "Edi Rama", "Socialist Party", 10, # social democracy
                prog_cons= -5,
                nat_glob= 30,
                env_eco= 22,
                soc_cap= -3,
                est_pop=  -10,
                auth_ana= 5,
                rel_sec = 0,
                colour='purple'),
        Candidate(6, "Sali Berisha", "Democratic Party", 10, # conservative liberalism
                prog_cons= 34,
                nat_glob= 41,
                env_eco= -23,
                soc_cap= 35,
                est_pop= -10,
                auth_ana= 4,
                rel_sec = -8,
                colour="blue"),
        Candidate(6, "Ilir Meta", "Freedom Party", 1, # nationalism
                prog_cons= 61,
                nat_glob= -52,
                env_eco= 25,
                soc_cap= 2,
                est_pop=  25,
                auth_ana= -31,
                rel_sec = -31,
                colour="orange"),
        Candidate(6, "Tom Doshi", "Social Democratic Party", 1, # progressives
                prog_cons= -35,
                nat_glob= 11,
                env_eco= -31,
                soc_cap= -41,
                est_pop=  11,
                auth_ana= 22,
                rel_sec =21,
                colour="red"),
    ],
    "UKRAINE" : [
        Candidate(8, "Volodymyr Zelenskyy", "Servant of the People", 10, # social democracy
                prog_cons= -15,
                nat_glob= 35,
                env_eco= 22,
                soc_cap= 40,
                est_pop=  35,
                auth_ana= 5,
                rel_sec = 0,
                colour='springgreen'),
        Candidate(6, "Petro Poroshenko", "European Solidarity", 6, # conservative liberalism
                prog_cons= 34,
                nat_glob= 32,
                env_eco= 43,
                soc_cap= 45,
                est_pop=  15,
                auth_ana= 4,
                rel_sec = -8,
                colour="yellow"),
        Candidate(6, "Yulia Tymoshenko", "Fatherland", 2, # nationalism
                prog_cons= 61,
                nat_glob= -52,
                env_eco= 25,
                soc_cap= 2,
                est_pop=  15,
                auth_ana= -31,
                rel_sec = -1,
                colour="red"),
        Candidate(6, "Ihor Palytsia", "For the Future", 1, #
                prog_cons= -5,
                nat_glob= -1,
                env_eco= 3,
                soc_cap= -23,
                est_pop=  -4,
                auth_ana= 22,
                rel_sec = 21,
                colour="purple"),
        Candidate(6, "Kira Rudyk", "Voice", 1, # pro europeanism
                prog_cons= 23,
                nat_glob= 61,
                env_eco= 59,
                soc_cap= 41,
                est_pop=  -24,
                auth_ana= -49,
                rel_sec = -21,
                colour="red"),
    ],
    "BELGIUM" : [
        Candidate(8, "Bart De Wever", "New Flemish Alliance", 10,
                prog_cons= 35,
                nat_glob= -20,
                env_eco= 32,
                soc_cap= 52,
                est_pop=  -5,
                auth_ana= 5,
                rel_sec = -10,
                colour='orange'),
        Candidate(6, "Tom Van Grieken", "Vlaams Belang", 4,
                prog_cons= 64,
                nat_glob= -52,
                env_eco= 0,
                soc_cap= -5,
                est_pop=  15,
                auth_ana= 12,
                rel_sec = -12,
                colour="yellow"),
        Candidate(6, "Sammy Mahdi", "CD&V", 2,
                prog_cons= 10,
                nat_glob= -12,
                env_eco= 0,
                soc_cap= 22,
                est_pop=  -5,
                auth_ana= -4,
                rel_sec = -31),
        Candidate(6, "Paul Magnette", "Socialist Party - Vooruit", 10,
                prog_cons= -10,
                nat_glob= 12,
                env_eco= 0,
                soc_cap= -2,
                est_pop=  -4,
                auth_ana= 10,
                rel_sec = 9,
                colour='red'),
        Candidate(6, "Raoul Hedebouw", "PVDA-PTB", 1,
                prog_cons= -64,
                nat_glob= -52,
                env_eco= -15,
                soc_cap= -86,
                est_pop= 5,
                auth_ana= 12,
                rel_sec = 82,
                colour='black'),
    ],
    "SOVIET UNION 1991" : [
        Candidate(8, "Mikhail Gorbachev", "Communist Party of the Soviet Union", 10,
                prog_cons= -34,
                nat_glob= 12,
                env_eco= 0,
                soc_cap= -85,
                est_pop=  45,
                auth_ana= -84,
                rel_sec = 87,
                colour="red"),

        Candidate(6, "Boris Yeltsin", "Democratic Union", 4,
                prog_cons= 21,
                nat_glob= -12,
                env_eco= 0,
                soc_cap= -12,
                est_pop=  35,
                auth_ana= -14,
                rel_sec = 37),
        Candidate(6, "Nikolay Lysenko", "National Republican Party", 3,
                prog_cons= 84,
                nat_glob= -12,
                env_eco= 0,
                soc_cap= -62,
                est_pop=  45,
                auth_ana= -74,
                rel_sec = -82),
    ],
    "GREECE" : [
        Candidate(8, "Kyriakos Mitsotakis", "New Democracy", 10,
                prog_cons= 34,
                nat_glob= 22,
                env_eco= 31,
                soc_cap= 35,
                est_pop=  -25,
                auth_ana= -34,
                rel_sec = -37,
                colour="blue"),

        Candidate(6, "Stefanos Kasselakis", "SYRIZA", 4,
                prog_cons= -21,
                nat_glob= -12,
                env_eco= 31,
                soc_cap= -32,
                est_pop=  15,
                auth_ana= 4,
                rel_sec = 37,
                colour='pink'),
        Candidate(6, "Nikos Androulakis", "Movement for Change", 3,
                prog_cons= -24,
                nat_glob= 32,
                env_eco= 2,
                soc_cap= 2,
                est_pop=  -5,
                auth_ana= 4,
                rel_sec = 0,
                colour='pink'),
        Candidate(6, "Dmitris Koutsoumpas", "Communist Party", 3,
                prog_cons= 14,
                nat_glob= -12,
                env_eco= 0,
                soc_cap= -72,
                est_pop=  15,
                auth_ana= -4,
                rel_sec = 32,
                colour='red'),
        Candidate(6, "Kyriakos Velopoulos", "Solution", 3,
                prog_cons= 84,
                nat_glob= -62,
                env_eco= 0,
                soc_cap= -12,
                est_pop=  45,
                auth_ana= -74,
                rel_sec = -2,
                colour='lightblue'),
    ],
    "HAMPTON" : [
        Candidate(8, "James Greenfield", "KPD", 5,
            prog_cons= -10,
            nat_glob= -60,
            env_eco= 0,
            soc_cap= -100,
            est_pop=  35,
            auth_ana= -85,
            rel_sec = 95,
            colour="red"),

        Candidate(6, "Danil Eliasov / Billiam the Third / Luc Mason", "4C Yes Please", 5, #4C Please = CCC + Confetto + Yes Please
            prog_cons= 90,
            nat_glob= -90,
            env_eco= 73,
            soc_cap= 41,
            est_pop=  82,
            auth_ana= -40,
            rel_sec = 100),

        Candidate(8, "Mehmet Altinel", "National Imperial Front", 5, #= Nation First + Front + Imperius
            prog_cons= 55,
            nat_glob= -75,
            env_eco= 65,
            soc_cap= 81,
            est_pop= 72,
            auth_ana= -63,
            rel_sec = -62),
        Candidate(1, "Indigo Nolan", "P&P", 5,  # P&P + MRL
            prog_cons= -21,
            nat_glob= 39,
            env_eco= -1,
            soc_cap= -2,
            est_pop= -5,
            auth_ana= 14,
            rel_sec = 12,
            colour="skyblue"),
        Candidate(7, "Theo Evison", "Prevalence", 5, # Prevalence
            prog_cons= 27,
            nat_glob= -15,
            env_eco= 40,
            soc_cap= 61,
            est_pop=  12,
            auth_ana= -51,
            rel_sec = 0,
            colour="purple"),

        Candidate(12, "William Greenfield", "Economic Reformists", 5,
            prog_cons= 80,
            nat_glob= 100,
            env_eco= 100,
            soc_cap= 100,
            est_pop= 0,
            auth_ana= 90,
            rel_sec = 0),
    ],
    "GERMANY" : [
        Candidate(0, "Olaf Scholz", "SPD", 10,
                prog_cons= -31,
                nat_glob= 45,
                env_eco= 3,
                soc_cap= -4,
                est_pop= 12,
                auth_ana= 12,
                rel_sec = 25,
                colour="red"),
        Candidate(1, "Friedrich Merz", "CDU", 10,
                prog_cons= 24,
                nat_glob= 44,
                env_eco= 14,
                soc_cap= 24,
                est_pop= 10,
                auth_ana= -12,
                rel_sec = -12,
                colour="black"),
        Candidate(3, "Ricarda Lang", "Alliance 90", 5,
                prog_cons= -35,
                nat_glob= 45,
                env_eco= -45,
                soc_cap= -1,
                est_pop= -23,
                auth_ana= 34,
                rel_sec = 54),
        Candidate(4, "Tino Chrupalla", "AfD", 3,
                prog_cons= 78,
                nat_glob= -45,
                env_eco= 45,
                soc_cap= 45,
                est_pop= 45,
                auth_ana= -45,
                rel_sec = -12),
    ],
    "RADICALS" : [
        Candidate(0, "Karl Max", "Maxists (P)", 5,
                prog_cons=-100,
                nat_glob= 100,
                env_eco= -100,
                soc_cap= -100,
                est_pop= -100,
                auth_ana= 100,
                rel_sec = 100),
        Candidate(0, "Adam Smith", "Radical Centrist Party", 5,
                prog_cons=0,
                nat_glob= 00,
                env_eco= 00,
                soc_cap= 00,
                est_pop= 00,
                auth_ana= 00,
                rel_sec = 00),
        Candidate(0, "Jonathan Gotlor", "Gotlorite Front", 5,
                prog_cons=100,
                nat_glob= -100,
                env_eco= 100,
                soc_cap= 100,
                est_pop= 100,
                auth_ana= -100,
                rel_sec = -100),
    ],
    "IRELAND" : [
        Candidate(0, "Michael Martin", "Fianna Fail", 10,
                prog_cons= 41,
                nat_glob= 12,
                env_eco= 34,
                soc_cap= 45,
                est_pop= 12,
                auth_ana= -4,
                rel_sec = -31),
        Candidate(1, "Mary Lou McDonald", "Sinn Fein", 9,
                prog_cons= -31,
                nat_glob= 43,
                env_eco= 31,
                soc_cap= -32,
                est_pop= 31,
                auth_ana= 35,
                rel_sec = -4),
        Candidate(3, "Leo Varadkar", "Fine Gael", 10,
                prog_cons= 32,
                nat_glob= -12,
                env_eco= 30,
                soc_cap= 65,
                est_pop= -12,
                auth_ana= -10,
                rel_sec = -21),
        Candidate(4, "Eamon Ryan", "Irish Greens", 3,
                prog_cons= -45,
                nat_glob= 41,
                env_eco= -46,
                soc_cap= -4,
                est_pop= -31,
                auth_ana= 29,
                rel_sec = 45),
        Candidate(4, "Padraigh O'Ryan", "Workers' Party", 0.1,
                prog_cons= 15,
                nat_glob= -61,
                env_eco= -46,
                soc_cap= -92,
                est_pop= 12,
                auth_ana= -51,
                rel_sec = 98),
    ],
    "TURKEY" : [
        Candidate(3, "Recep Erdogan", "AKP", 9,
                prog_cons= 56,
                nat_glob= -35,
                env_eco= 23,
                soc_cap= 65,
                est_pop= 31,
                auth_ana= -64,
                rel_sec = -64,
                swing=3),
        Candidate(4, "Ozgur Ozel", "Republican People's Party", 9,
                prog_cons= -12,
                nat_glob= -12,
                env_eco= -46,
                soc_cap= -4,
                est_pop= -31,
                auth_ana= -12,
                rel_sec = 53),
        Candidate(4, "Mithat Sancar", "Democratic Party", 2,
                prog_cons= -45,
                nat_glob= 41,
                env_eco= -46,
                soc_cap= -4,
                est_pop= -31,
                auth_ana= 29,
                rel_sec = 87,
                colour="blue"),
        Candidate(4, "Devlet Bahceli", "Nationalist Movement", 2,
                prog_cons= 85,
                nat_glob= -51,
                env_eco= 16,
                soc_cap= -4,
                est_pop= 61,
                auth_ana= -29,
                rel_sec = -78),
    ],
    "NOLANS" : [
        Candidate(0, "Indigo Nolan", "Federalist Party", 2,
                prog_cons= -60,
                nat_glob= 30,
                env_eco= -5,
                soc_cap= 15,
                est_pop= -10,
                auth_ana= -15,
                rel_sec = 85),
        Candidate(1, "Juliet Nolan", "The Greens", 2,
                prog_cons= -80,
                nat_glob= 65,
                env_eco= -95,
                soc_cap= -45,
                est_pop= 0,
                auth_ana= 75,
                rel_sec = 95),
        Candidate(2, "Dale Nolan", "Status", 2,
                prog_cons= -12,
                nat_glob= -1,
                env_eco= -4,
                soc_cap= 62,
                est_pop= 45,
                auth_ana= -12,
                rel_sec = 2),
    ],
    "MEXICO" : [
        Candidate(0, "Ismael Urena", "MORENA", 2,
                prog_cons= 0,
                nat_glob= -30,
                env_eco= 5,
                soc_cap= -35,
                est_pop= 0,
                auth_ana= -15,
                rel_sec = 35,
                colour='red'),
        Candidate(1, "Antonio Ramo Silva", "Partido Accion", 8,
                prog_cons= 60,
                nat_glob= -5,
                env_eco= 25,
                soc_cap= 55,
                est_pop= 0,
                auth_ana= -5,
                rel_sec = -20,
                colour='blue'),
        Candidate(2, "Jose Ocampo Rubio", "Partido Institucional", 8,
                prog_cons= 12,
                nat_glob= -35,
                env_eco= 5,
                soc_cap= -60,
                est_pop= 25,
                auth_ana= -42,
                rel_sec = -40,
                colour='green'),
        Candidate(2, "Alvaro Miralles Seco", "Ciudadano", 2,
                prog_cons= -32,
                nat_glob= 34,
                env_eco= -10,
                soc_cap= 21,
                est_pop= 0,
                auth_ana= 0,
                rel_sec = 10,
                colour='yellow'),
    ],
    "AUSTRIA" : [
        Candidate(8, "Karl Nehammer", "ÖVP", 10,
                prog_cons= 55,
                nat_glob= -30,
                env_eco= -2,
                soc_cap= 65,
                est_pop=  15,
                auth_ana= -25,
                rel_sec = -50),
        Candidate(6, "Werner Kogler", "Die Grune", 6,
                prog_cons= -2,
                nat_glob= 23,
                env_eco= -82,
                soc_cap= -2,
                est_pop=  0,
                auth_ana= 39,
                rel_sec = 12),
        Candidate(6, "Andreas Babler", "SPÖ", 10,
                prog_cons= -14,
                nat_glob= 12,
                env_eco= -5,
                soc_cap= -2,
                est_pop=  5,
                auth_ana= 2,
                rel_sec = 23),
        Candidate(6, "Herbert Kickl", "FPÖ", 1,
                prog_cons= 75,
                nat_glob= -65,
                env_eco= 63,
                soc_cap= -3,
                est_pop=  84,
                auth_ana= -71,
                rel_sec = -45),
        Candidate(6, "Beate Meinl-Reisinger", "NEOS", 1,
                prog_cons= 13,
                nat_glob= -65,
                env_eco= 93,
                soc_cap= 89,
                est_pop=  0,
                auth_ana= 12,
                rel_sec = 0),
        Candidate(9, "Kurt Murfelfitz", "KPÖ", 1,
                prog_cons= 5,
                nat_glob= -85,
                env_eco= -2,
                soc_cap= -92,
                est_pop=  45,
                auth_ana= -72,
                rel_sec = 98),
        Candidate(10, "Ferdi Habsburg-Lorraine", "Die Monarchisten", 1,
                prog_cons= 95,
                nat_glob= -45,
                env_eco= -2,
                soc_cap= 64,
                est_pop=  45,
                auth_ana= -100,
                rel_sec = -40),
    ],
    "CUSTOM" : [
        Candidate(0, "Keir Starmer", "CLA", 5, # centre left
            prog_cons=-10,
            nat_glob= 10,
            env_eco= -10,
            soc_cap= -1,
            est_pop= 00,
            auth_ana= 0,
            rel_sec = 000),
        Candidate(0, "David Cameron", "CRF", 5, # centre right
                prog_cons=10,
                nat_glob= -10,
                env_eco= 10,
                soc_cap= 20,
                est_pop= 10,
                auth_ana= -10,
                rel_sec = 00),
        Candidate(0, "Jeremy Corbyn", "FLA", 5, # far right
                prog_cons=-30,
                nat_glob= -10,
                env_eco= 20,
                soc_cap= -60,
                est_pop= 00,
                auth_ana= 00,
                rel_sec = 00),
        Candidate(0, "Rishi Sunak", "FRA", 5, # far right
                prog_cons=30,
                nat_glob= -20,
                env_eco= 20,
                soc_cap= 60,
                est_pop= 20,
                auth_ana= -10,
                rel_sec = 00),
    ],
    "COMBINATION": [
        Candidate(7, "Theo Evison", "Prevalence", 5, # Prevalence
            prog_cons= 27,
            nat_glob= -15,
            env_eco= 40,
            soc_cap= 61,
            est_pop=  12,
            auth_ana= -51,
            rel_sec = 0,
            colour="purple"),
    ],
    "SOMALIA": [
        Candidate(12, "Faysal Ali Warabe", "For Justice and Development", 10,
            prog_cons= -2,
            nat_glob= -50,
            env_eco= 41,
            soc_cap= -30,
            est_pop= 39,
            auth_ana= 40,
            rel_sec = 0),
        Candidate(12, "Muse Bihi", "Peace, Unity and Development", 10,
            prog_cons= -5,
            nat_glob= 20,
            env_eco= 12,
            soc_cap= 10,
            est_pop= 30,
            auth_ana= -10,
            rel_sec = 40),
        Candidate(12, "Hersi Ali Hassan", "National Party (Waddani)", 10,
            prog_cons= 41,
            nat_glob= -50,
            env_eco= 41,
            soc_cap= -20,
            est_pop= 40,
            auth_ana= -30,
            rel_sec = -50),
    ],
    "FRANCE" : [
        Candidate(8, "Emmanuel Macron", "Renaissance", 7,
                prog_cons= -2,
                nat_glob= 30,
                env_eco= 13,
                soc_cap= 55,
                est_pop= -15,
                auth_ana= -35,
                rel_sec = 54,
                colour="gold"),
        Candidate(6, "Eric Ciotti", "Les Republicains", 4,
                prog_cons= 22,
                nat_glob= -5,
                env_eco= 12,
                soc_cap= 51,
                est_pop=  -45,
                auth_ana= -39,
                rel_sec = -12,
                swing=-10,
                colour="red"),
        Candidate(6, "Marine Le Pen", "National Rally", 7,
                prog_cons= 76,
                nat_glob= -51,
                env_eco= 12,
                soc_cap= 45,
                est_pop=  72,
                auth_ana= -10,
                rel_sec = -45,
                swing=5,
                colour="navy"),
        Candidate(6, "Jean-Luc Melenchon", "La France Insoumise", 5,
                prog_cons= -4,
                nat_glob= -65,
                env_eco= 63,
                soc_cap= -63,
                est_pop= 57,
                auth_ana= 23,
                rel_sec = 71,
                colour="purple"),
        Candidate(6, "Olivier Faure", "Socialistes", 5,
                prog_cons= -23,
                nat_glob= 12,
                env_eco= -13,
                soc_cap= -41,
                est_pop=  -21,
                auth_ana= -12,
                rel_sec = 42,
                swing=-5,
                colour="black"),
    ],
    "POLAND" : [
        Candidate(8, "Jaroslaw Kaczynski", "Law and Justice", 7,
                prog_cons= 42,
                nat_glob= -30,
                env_eco= 13,
                soc_cap= 0,
                est_pop=  15,
                auth_ana= -45,
                rel_sec = -34,
                colour="blue"),
        Candidate(6, "Donald Tusk", "Civic Platform", 7,
                prog_cons= -2,
                nat_glob= 35,
                env_eco= 52,
                soc_cap= 51,
                est_pop=  0,
                auth_ana= -19,
                rel_sec = 2,
                colour="gold"),
        Candidate(6, "Szymon Holownia", "Poland 2050", 4,
                prog_cons= -6,
                nat_glob= 31,
                env_eco= -41,
                soc_cap= 5,
                est_pop=  -12,
                auth_ana= 30,
                rel_sec = 45,
                colour="green"),
        Candidate(6, "Wladyslaw Koziniak-Kamysz", "People's Party", 2,
                prog_cons= 44,
                nat_glob= 15,
                env_eco= 63,
                soc_cap= 43,
                est_pop=  12,
                auth_ana= -23,
                rel_sec = -61,
                colour="purple"),
        Candidate(6, "Robert Biedron", "New Left", 1,
                prog_cons= -43,
                nat_glob= 12,
                env_eco= -3,
                soc_cap= -41,
                est_pop=  21,
                auth_ana= -12,
                rel_sec = 65,
                colour="red"),
    ],
    "KRESIMIRIA" : [
        Candidate(0, "Pope Kresimir V", "Kresimirovic Unity", 10,
            prog_cons = 30,
            nat_glob = 14,
            env_eco = -10,
            soc_cap =  -2,
            est_pop= 61,
            auth_ana= -63,
            rel_sec = -98),
        Candidate(0, "Pope Raleigh VII", "Caeserin Front", 1,
            prog_cons = -39,
            nat_glob = -35,
            env_eco = 12,
            soc_cap = 12,
            est_pop= 87,
            auth_ana= -85,
            rel_sec = -87),
        Candidate(0, "Counts of Knin", "Liberty Alliance", 1,
            prog_cons = 39,
            nat_glob = -35,
            env_eco = 12,
            soc_cap = 12,
            est_pop= 61,
            auth_ana= 45,
            rel_sec = 57),
        Candidate(0, "Duke Zvonomir", "PSO", 1,
            prog_cons = -59,
            nat_glob = 35,
            env_eco = -42,
            soc_cap = -45,
            est_pop= -10,
            auth_ana= -10,
            rel_sec = -76),
    ],
    "SORLAND" : [
        Candidate(0, "Tarquin Soll", "United Sordland Party", 10,
            prog_cons = 30,
            nat_glob = -30,
            env_eco = -11,
            soc_cap =  -51,
            est_pop= 12,
            auth_ana= -61,
            rel_sec = 24),
        Candidate(0, "Frens Richter", "PFJP", 7,
            prog_cons = -21,
            nat_glob = -1,
            env_eco = 0,
            soc_cap = 12,
            est_pop= 4,
            auth_ana= 2,
            rel_sec = 1),
        Candidate(0, "Kesaro Kibener", "National Front", 3,
            prog_cons = 76,
            nat_glob = -95,
            env_eco = 35,
            soc_cap = 12,
            est_pop= 61,
            auth_ana= -75,
            rel_sec = -67),
        Candidate(0, "Malenyevists", "Kommuniste Parte", 3,
            prog_cons = -12,
            nat_glob = -45,
            env_eco = -42,
            soc_cap = -98,
            est_pop= 12,
            auth_ana= -20,
            rel_sec = 86),
    ],
    "SPAIN" : [
        Candidate(8, "Alberto Nunez Felijoo", "People's Party", 10,
                prog_cons= 34,
                nat_glob= -12,
                env_eco= 34,
                soc_cap= 55,
                est_pop=  -15,
                auth_ana= -12,
                rel_sec = -12,
                colour="blue"),
        Candidate(6, "Pedro Sanchez", "PSOE", 10,
                prog_cons= -21,
                nat_glob= 12,
                env_eco= 1,
                soc_cap= 4,
                est_pop=  -15,
                auth_ana= 2,
                rel_sec = 41,
                colour="red"),
        Candidate(6, "Santiago Abascal", "Vox", 3,
                prog_cons= 84,
                nat_glob= -52,
                env_eco= 41,
                soc_cap= 45,
                est_pop=  45,
                auth_ana= -74,
                rel_sec = -82,
                colour="green"),
        Candidate(6, "Yolanda Diaz", "Unite / Podemos", 3,
                prog_cons= -45,
                nat_glob= 34,
                env_eco= -41,
                soc_cap= -42,
                est_pop=  45,
                auth_ana= 31,
                rel_sec = 42),
    ],
    "VENEZUELA" : [
        Candidate(0, "Nicolas Maduro", "Great Patriotic Pole", 10,
                prog_cons= 53,
                nat_glob= -44,
                env_eco= 4,
                soc_cap= -61,
                est_pop= 19,
                auth_ana= -41,
                rel_sec = 2),
        Candidate(0, "Juan Guaido", "Popular Will", 2,
                prog_cons= -31,
                nat_glob= 31,
                env_eco= 23,
                soc_cap= 41,
                est_pop= 12,
                auth_ana= 21,
                rel_sec = -4),
        Candidate(2, "Henry Ramos Allup", "Unitary Platform", 2,
                prog_cons= 32,
                nat_glob= 41,
                env_eco= 43,
                soc_cap= 71,
                est_pop= 22,
                auth_ana= -1,
                rel_sec = 11),
    ],
    "OTH" : [
        Candidate(0, "Indigo Westwood", "People's Voice", 5,
                prog_cons= -41,
                nat_glob= 39,
                env_eco= -15,
                soc_cap= -2,
                est_pop= -5,
                auth_ana= 14,
                rel_sec = 12,
                colour="skyblue"),
        Candidate(0, "Stephen Barrett", "Liberal Party", 5,
                prog_cons= 51,
                nat_glob= -51,
                env_eco= 53,
                soc_cap= 61,
                est_pop= 42,
                auth_ana= -41,
                rel_sec = -61,
                colour="orange"),
        Candidate(2, "Sally McLaughlin", "Party for Change", 5,
                prog_cons= -32,
                nat_glob= -41,
                env_eco= 13,
                soc_cap= -71,
                est_pop= 22,
                auth_ana= 51,
                rel_sec = 80),
        Candidate(2, "Thomas Cooke", "Renewal", 5,
                prog_cons= 92,
                nat_glob= -91,
                env_eco= 71,
                soc_cap= -5,
                est_pop= 42,
                auth_ana= -81,
                rel_sec = 0),
    ],
    "NI" : [
        Candidate(1, "Michelle O'Neill", "Sinn Fein", 10,
                prog_cons= -31,
                nat_glob= 23,
                env_eco= 31,
                soc_cap= -22,
                est_pop= 31,
                auth_ana= 35,
                rel_sec = -24,
                colour="green"),
        Candidate(6, "Sir Jeffrey Donaldson", "DUP", 10,
                prog_cons= 61,
                nat_glob= -52,
                env_eco= 13,
                soc_cap= 41,
                est_pop=  31,
                auth_ana= 41,
                rel_sec = -41,
                colour="orange"),
        Candidate(6, "Naomi Long", "APNI", 3,
                prog_cons= 4,
                nat_glob= 12,
                env_eco= 41,
                soc_cap= 45,
                est_pop= -25,
                auth_ana= 14,
                rel_sec = 72,
                colour="yellow"),
        Candidate(6, "Doug Beattie", "UUP", 1,
                prog_cons= 51,
                nat_glob= -34,
                env_eco= 61,
                soc_cap= 72,
                est_pop=  15,
                auth_ana= -41,
                rel_sec = -42),
        Candidate(6, "Colum Eastwood", "SDLP", 3,
                prog_cons= -15,
                nat_glob= -4,
                env_eco= 11,
                soc_cap= 12,
                est_pop=  -14,
                auth_ana= -3,
                rel_sec = 12),
    ],
    "SCHOOL COUNCIL" : [
        Candidate(1, "Xavier Zadeh", "Xavier Zadeh", 10,
                prog_cons= 71,
                nat_glob= -43,
                env_eco= 31,
                soc_cap= 52,
                est_pop= 31,
                auth_ana= -55,
                rel_sec = -24,
                colour="green"),
        Candidate(6, "Nolan - Evison", "Nolan - Evison", 10,
                prog_cons= 61,
                nat_glob= -52,
                env_eco= 13,
                soc_cap= 41,
                est_pop=  31,
                auth_ana= 41,
                rel_sec = -41,
                colour="blue"),
        Candidate(6, "Kristof Blantchford", "Christopher Blanchie", 3,
                prog_cons= -71,
                nat_glob= 61,
                env_eco= -12,
                soc_cap= -45,
                est_pop= -25,
                auth_ana= 24,
                rel_sec = 72,
                colour="yellow"),
        Candidate(6, "Guy Baakre", "Guy Baker", 1,
                prog_cons= -3,
                nat_glob= -14,
                env_eco= 11,
                soc_cap= 12,
                est_pop=  15,
                auth_ana= -41,
                rel_sec = 12),
        Candidate(6, "Davlatsho Shirinbekov", "Davlatsho Shirinbekov", 3,
                prog_cons= 75,
                nat_glob= -46,
                env_eco= 61,
                soc_cap= -51,
                est_pop=  44,
                auth_ana= -53,
                rel_sec = -92),
    ],
    "CURRENT": []
}




os.system('cls' if os.name == 'nt' else 'clear') # clear and then ask
for x in CAND_LIST.keys():
    print(x)
CHOICE = input("\nPick a party group from the list above: ")
if "+" in CHOICE: # if two party groups
    CHOICES = CHOICE.split("+")
    CAND_LIST["CUSTOM"] = []
    for x in range(len(CHOICES)):
        try:
            CHOICES[x] =  difflib.get_close_matches(CHOICES[x].upper().strip(), CAND_LIST.keys(), 1)[0]
        except:
            print(f"{CHOICES[x]} is not a party list.")
        CAND_LIST["CUSTOM"] = CAND_LIST["CUSTOM"] + CAND_LIST[CHOICES[x]]
    CHOICE = "CUSTOM"

else:
    CHOICE = difflib.get_close_matches(CHOICE.upper().strip(), CAND_LIST.keys(), 1)[0]

def merge_party_names(party1, party2):
    # Split the party names into parts
    parts1 = party1.split()
    parts2 = party2.split()
    seq=difflib.SequenceMatcher(None, party1,party2)
    d=seq.ratio()*100

    # Take a portion of each name


    # Combine the parts to form the merged name
    #print(d)
    if d > 60:
        merged_name = party1
    else:
        if parts1[-1].strip() =="Party":
            party1 = " ".join(parts1[:-1])

        if len(party1) >= 15: # if the name is extremely long
            party1 = ""
            for x in parts1:
                party1 += (x[0])
            #party1 = party1[:-1] # cut off trailing space

        merged_name = f"{party1} - {party2}"

    return merged_name



# merging the parties

if DEBUG: print(f"DEBUG: original value {TOO_CLOSE_PARTY}")
if DEBUG: print(f"DEBUG: number of parties {len(CAND_LIST[CHOICE])}")
if DEBUG: print(f"DEBUG:  multiplier {1+(((len(CAND_LIST[CHOICE])-6))/20)}")

TOO_CLOSE_PARTY *= 1+(((len(CAND_LIST[CHOICE])-6))/5) # 6 being the standard party list (assumed)
if DEBUG: print(f"DEBUG: new value {TOO_CLOSE_PARTY}")


# merging the too close parties
def merge_too_close(x):
    merges = 0
    while len(CAND_LIST[CHOICE]) > 0:

        dists = []
        if x>=len(CAND_LIST[CHOICE]): x = 0

        for i in range(len(CAND_LIST[CHOICE])): # finding closest ideological party
            part = CAND_LIST[CHOICE][i]
            led = CAND_LIST[CHOICE][x]
            euc_sum = 0
            for o in range(len(led.vals)): # sum square of each value
                euc_sum += (led.vals[o] - part.vals[o])**2
                if (led.vals[o] >0 and part.vals[o] < 0) or (led.vals[0] < 0 and part.vals[0] > 0):
                    euc_sum += 100000 / len(led.vals) # party merging value flips
            euc_dist = math.sqrt(euc_sum) # square root to find euclidean distance
            dists.append(euc_dist) # add to distance list

        dists[dists.index(0)] = 999999
        index_min = min(range(len(dists)), key=dists.__getitem__) # find preferred candidate by closest distance
        if dists[index_min] < TOO_CLOSE_PARTY:
            
            print(f"{COUNTRY} - PARTIES TO SORT: {len(CAND_LIST[CHOICE])-1} \nThe electoral commission has warned that {CAND_LIST[CHOICE][x].party} and {CAND_LIST[CHOICE][index_min].party} are too politically similar.\n")

            print(f"{CAND_LIST[CHOICE][x].party} and {CAND_LIST[CHOICE][index_min].party} have formed a coalition.")

            sent1 = CAND_LIST[CHOICE][x].party
            sent2 = CAND_LIST[CHOICE][index_min].party

            nam = input("Enter a name for the merged parties (leave empty to refuse the coalition, 'a' to generate a name):\n").strip()
            if nam == '': pass
            else:
                
                if nam in ['a', 'A']:
                    nam = merge_party_names(sent1, sent2)

                CAND_LIST[CHOICE][x].party = nam
                CAND_LIST[CHOICE][x].name = CAND_LIST[CHOICE][x].name + " / " + CAND_LIST[CHOICE][index_min].name
                CAND_LIST[CHOICE][x].party_pop = math.sqrt(CAND_LIST[CHOICE][x].party_pop**2  + CAND_LIST[CHOICE][index_min].party_pop**2)
                
                for v in range(len(CAND_LIST[CHOICE][x].vals)):
                    CAND_LIST[CHOICE][x].vals[v] = round((CAND_LIST[CHOICE][x].vals[v]+CAND_LIST[CHOICE][index_min].vals[v]) /2)

                CAND_LIST[CHOICE].pop(index_min)
                print(f"A new party, {nam}, has been formed.")
                merges += 1
                input()

            os.system('cls' if os.name == 'nt' else 'clear')

        if x>=len(CAND_LIST[CHOICE]): x =0
        CAND_LIST["CURRENT"].append(CAND_LIST[CHOICE][x])
        CAND_LIST[CHOICE].pop(x)
        x+=1
    
    return merges


while merge_too_close(0) != 0:
    CAND_LIST[CHOICE] = CAND_LIST["CURRENT"] # set the candidate lists back
    CAND_LIST["CURRENT"] = [] # empty the final candidate lists
    print("Still going!") # go again




CHOICE = "CURRENT"
# SETTIG UP CANDIDATE LIST
ys = {}
CANDIDATES = CAND_LIST[CHOICE] # SET CANDIDATE LIST TO USE
for m in range(len(CANDIDATES)):
    CANDIDATES[m].id = m
    ys[CANDIDATES[m]] = []; # set y value to 0


def closest(lst, K):
    return lst[min(range(len(lst)), key = lambda i: abs(lst[i]-K))]

def print_gov_ideology(res, coal):
    print("\nThis is a ", end="")
    ideo = gov_ideology(res, coal)
    if len(ideo) == 1:
        print(ideo[0] + " government.")
    else:
        for x in range(len(ideo)):
            if x < len(ideo)-1:
                print(ideo[x] + ",", end=" ")
            else:
                print(ideo[x] + " government led by " + coal[0].name + ".")

def gov_ideology(res, gov):

    return_descs = []
    percs = []
    for x in gov:
        for r in res:
            if r[0] == x:
                percs.append(r[1]/VOTING_DEMOS[COUNTRY]['pop'])
                break

    for v in range(len(gov[0].vals)): # get average policies of government
        avg = 0
        for party in range(len(gov)):
            #print("thing", gov[party].vals[v] * percs[party])
            avg += gov[party].vals[v] * percs[party]

        #print("before adjustement", avg)
        #avg = round(avg/ len(gov)) todo analyse
        avg /= sum(percs)
        #print(sum(percs))

        closest_d = DESCRIPTORS[VALUES[v]][closest(list(DESCRIPTORS[VALUES[v]].keys()), avg)]
        #print("after", avg)
        #print("so", closest_d)

        if closest_d != None: return_descs.append(closest_d)
    return return_descs

# ~~~~~~~~~~ MAIN ~~~~~~~~~~~~

RESULTS = []
not_voted = 0
for cand in CANDIDATES:
    RESULTS.append([cand, 0])

data = [ # create normal distributions for each value axis
    # 50, 100, 150, 70, 120, 160, 160
    # the scale is kind of how spread it is / how much radicals are tolerated
    
    #numpy.random.uniform(VOTING_DEMOS[COUNTRY]["vals"]["prog_cons"]-100, VOTING_DEMOS[COUNTRY]["vals"]["prog_cons"]+100, size=VOTING_DEMOS[COUNTRY]["pop"]), # prog - cons
    #numpy.random.uniform(VOTING_DEMOS[COUNTRY]["vals"]["nat_glob"]-100, VOTING_DEMOS[COUNTRY]["vals"]["nat_glob"]+100, size=VOTING_DEMOS[COUNTRY]["pop"]), # nat - glob
    #numpy.random.uniform(VOTING_DEMOS[COUNTRY]["vals"]["env_eco"]-100, VOTING_DEMOS[COUNTRY]["vals"]["env_eco"]+100, size=VOTING_DEMOS[COUNTRY]["pop"]), # env - eco
    #numpy.random.uniform(VOTING_DEMOS[COUNTRY]["vals"]["soc_cap"]-100, VOTING_DEMOS[COUNTRY]["vals"]["soc_cap"]+100, size=VOTING_DEMOS[COUNTRY]["pop"]), # soc - cap
    #numpy.random.uniform(VOTING_DEMOS[COUNTRY]["vals"]["est_pop"]-100, VOTING_DEMOS[COUNTRY]["vals"]["est_pop"]+100, size=VOTING_DEMOS[COUNTRY]["pop"]), # est - pop
    #numpy.random.uniform(VOTING_DEMOS[COUNTRY]["vals"]["auth_ana"]-100, VOTING_DEMOS[COUNTRY]["vals"]["auth_ana"]+100, size=VOTING_DEMOS[COUNTRY]["pop"]), # auth - ana
    #numpy.random.uniform(VOTING_DEMOS[COUNTRY]["vals"]["rel_sec"]-100, VOTING_DEMOS[COUNTRY]["vals"]["rel_sec"]+100, size=VOTING_DEMOS[COUNTRY]["pop"]), # rel -sec

    numpy.random.normal(loc = VOTING_DEMOS[COUNTRY]["vals"]["prog_cons"], scale = 100, size=VOTING_DEMOS[COUNTRY]["pop"]), # prog - cons
    numpy.random.normal(loc = VOTING_DEMOS[COUNTRY]["vals"]["nat_glob"], scale = 120, size=VOTING_DEMOS[COUNTRY]["pop"]), # nat - glob
    numpy.random.normal(loc = VOTING_DEMOS[COUNTRY]["vals"]["env_eco"], scale = 150, size=VOTING_DEMOS[COUNTRY]["pop"]), # env - eco
    numpy.random.normal(loc = VOTING_DEMOS[COUNTRY]["vals"]["soc_cap"], scale = 100, size=VOTING_DEMOS[COUNTRY]["pop"]), # soc - cap
    numpy.random.normal(loc = VOTING_DEMOS[COUNTRY]["vals"]["est_pop"], scale = 120, size=VOTING_DEMOS[COUNTRY]["pop"]), # pac - mil
    numpy.random.normal(loc = VOTING_DEMOS[COUNTRY]["vals"]["auth_ana"], scale = 160, size=VOTING_DEMOS[COUNTRY]["pop"]), # auth - ana
    numpy.random.normal(loc = VOTING_DEMOS[COUNTRY]["vals"]["rel_sec"], scale = 160, size=VOTING_DEMOS[COUNTRY]["pop"]), # rel - sec

    # OLD VALUES
    #numpy.random.normal(loc = VOTING_DEMOS[COUNTRY]["vals"]["prog_cons"], scale = 50, size=VOTING_DEMOS[COUNTRY]["pop"]), # prog - cons
    #numpy.random.normal(loc = VOTING_DEMOS[COUNTRY]["vals"]["nat_glob"], scale = 100, size=VOTING_DEMOS[COUNTRY]["pop"]), # nat - glob
    #numpy.random.normal(loc = VOTING_DEMOS[COUNTRY]["vals"]["env_eco"], scale = 150, size=VOTING_DEMOS[COUNTRY]["pop"]), # env - eco
    #numpy.random.normal(loc = VOTING_DEMOS[COUNTRY]["vals"]["soc_cap"], scale = 50, size=VOTING_DEMOS[COUNTRY]["pop"]), # soc - cap
    #numpy.random.normal(loc = VOTING_DEMOS[COUNTRY]["vals"]["est_pop"], scale = 120, size=VOTING_DEMOS[COUNTRY]["pop"]), # pac - mil
    #numpy.random.normal(loc = VOTING_DEMOS[COUNTRY]["vals"]["auth_ana"], scale = 160, size=VOTING_DEMOS[COUNTRY]["pop"]), # auth - ana
    #numpy.random.normal(loc = VOTING_DEMOS[COUNTRY]["vals"]["rel_sec"], scale = 160, size=VOTING_DEMOS[COUNTRY]["pop"]), # rel - sec

]
FACTORS = {
    "prog_cons": 0,
    "nat_glob": 0,
    "env_eco": 0,
    "soc_cap": 0,
    "est_pop": 0,
    "auth_ana": 0,
    "rel_sec": 0,
}


for x in range(len(data)):
    numpy.random.shuffle(data[x])


#start options

try: TIME = float(input("Delay between polls: (0->10) [2] : ")) # seconds
except ValueError: TIME = 2 # default is delay of 2

DELAY = (TIME*50)/(math.sqrt(VOTING_DEMOS[COUNTRY]["pop"]))

try: POLL_COUNTER += ((int(input("Number of polls (0->10) (default 5) : ")))-5)*5
except ValueError: pass # default is no change to polls (ie value of 5)


# ~~~~~~~~~~ VOTING SYSTEMS ~~~~~~~~~

os.system('cls' if os.name == 'nt' else 'clear')
MODES = ["FPTP", "RUNOFF", "PROP REP"]
DESCRIPTORS_FOR_MODES = ["Biggest Party Wins", "Presidential", "Other Parliaments"]
print("~"*40)
for x in range(len(MODES)):
    print(MODES[x] + " (" + DESCRIPTORS_FOR_MODES[x] + ")")

r_count = 0
try:mode = difflib.get_close_matches(input("\nWhich voting system do you want to simulate? [PR] ").strip().upper(), MODES, 1)[0]
except: mode = "PROP REP"
if mode == "RUNOFF":
    r_done = False
    while not r_done:
        r_count = input("\nHow many rounds do you want? ")
        try: r_count = int(r_count); r_done = True
        except: pass


if input("Is voting mandatory? (Y/N) [N]") in ['Y', 'y', 'yes']:
    VOTE_MANDATE = True

# end options


if COUNTRY != CHOICE: # reduce predetermined party popularity if not the relevant country
    for c in CANDIDATES:
        c.party_pop *= 0.6 # change popularity to a factor of 0.6

def print_parliament(results, leaders):
    mpl.clf()
    mpl.cla()
    mpl.close()

    try: seat_num = int(input("Parliament seats: (504) "))
    except: seat_num = 504

    rows = round(0.62 * math.sqrt(seat_num))
    gov = []
    gov_seats = []
    opp = []
    opp_seats = []

    parties, vote_counts = zip(*results)
    colours = []
    g_tick = 00
    r_tick = 00
    for x in range(len(parties)):
        #x.colour
        if parties[x] in leaders:
            gov_seats.append(x)
            gov.append(parties[x].party)
            #colours.append(f"#{str(hex(g_tick))[2:].zfill(2)}{str(hex(255-g_tick))[2:].zfill(2)}{'00'.zfill(2)}") # varying greens
            #todo reinstate
            #colours.append(f"#{str(hex(random.randrange(0, 100)))[2:].zfill(2)}{str(hex(random.randrange(100, 255)))[2:].zfill(2)}{str(hex(random.randrange(0, 200)))[2:].zfill(2)}") # varying reds
            colours.append(f"#{str(hex(random.randrange(0, 255)))[2:].zfill(2)}{str(hex(random.randrange(0, 255)))[2:].zfill(2)}{str(hex(random.randrange(0, 255)))[2:].zfill(2)}") # varying reds
            
            g_tick += round((255/len(parties)))

    for x in range(len(parties)):
        if parties[x] not in leaders:
            opp_seats.append(x)
            opp.append(parties[x].party)
            #colours.append(f"#{str(hex(random.randrange(0, 2**24)))[2:]}")

            # todo reinstate
            #colours.append(f"#{str(hex(random.randrange(100, 255)))[2:].zfill(2)}{str(hex(random.randrange(0, 100)))[2:].zfill(2)}{str(hex(random.randrange(0, 200)))[2:].zfill(2)}") # varying reds
            colours.append(f"#{str(hex(random.randrange(0, 255)))[2:].zfill(2)}{str(hex(random.randrange(0, 255)))[2:].zfill(2)}{str(hex(random.randrange(0, 255)))[2:].zfill(2)}") # varying reds
            r_tick += round((255/len(parties)))



    parties = [x.party for x in parties] # getting party names


    # Huntington-Hill is the method used to allocate House of Representatives seats to US states
    ha_allocations = appointment.methods.highest_averages(
        averaging_style="Huntington-Hill",
        shares=vote_counts,
        total_alloc=seat_num,
        alloc_threshold=None, # 4% threshold
        min_alloc=1,
        tie_break="majority",
        majority_bonus=False,
        modifier=9,
    )

    #lr_allocations = appointment.methods.largest_remainder(
    #    quota_style="Droop",
    #    shares=vote_counts,
    #    total_alloc=seat_num,
    #    alloc_threshold=0.04, # minimum threshold 4%
    #    min_alloc=None,
    #    tie_break="majority",
    #    majority_bonus=False,
    #)
    #ha_allocations = lr_allocations
    #print(ha_allocations)
    #input()
    ordered_allocations = gov_seats + opp_seats
    ordered_allocations = [ha_allocations[x] for x in ordered_allocations]
    #print(ha_allocations)
    gov_seat_total = sum([ha_allocations[x] for x in gov_seats])
    opp_seat_total = sum([ha_allocations[x] for x in opp_seats])
    seat_total = gov_seat_total + opp_seat_total
    print(f"\nGovernment: {gov_seat_total} seats - {round(100 * gov_seat_total/seat_total, 2)}% - Majority of {gov_seat_total-opp_seat_total-1}")
    for x in range(len(gov)):
        if ha_allocations[gov_seats[x]] != 0: print(f"> {gov[x]} ~ {ha_allocations[gov_seats[x]]} seats")
    print(f"\nOpposition: {opp_seat_total} seats")
    for x in range(len(opp)):
        if ha_allocations[opp_seats[x]] != 0: print(f"> {opp[x]} ~ {ha_allocations[opp_seats[x]]} seats")

    #print(ha_allocations)
    #print(parties)
    fig, ax1 = mpl.subplots(nrows = 1, ncols=1)
    ax1 = psk.plot.parliament(
        allocations=ordered_allocations,
        labels=parties,
        colors=colours,
        style="rectangle",
        num_rows=rows,
        marker_size= round(60000/(seat_num+5)),
        #301
        speaker=False,
        axis=ax1,
    )

    mpl.title(("Parliament of " + COUNTRY).title())
    mpl.legend(["GOV - " + x if x in gov else "OPP - " + x for x in (gov+opp)])
    mpl.rcParams["figure.figsize"] = [5, 5]
    mpl.show()
    input("\n[...Showing parliament...]")



def print_parliament_old(results, leaders):

    seat_num = 400
    rows = 16

    print("\n---" + COUNTRY.title() + " Parliament Seats---")

    seats = {}
    for p in results:
        seats[p[0]] = 0

    total_votes = 0
    for x in results:
        total_votes += x[1]
    for x in results:
        seats[x[0]] = round(x[1]/total_votes * seat_num)


    #print(results)
    #print(leaders)

    if len(leaders) == 1: #FPTP or a majority

        print("\n - Government:")
        party_num = 0
        cur_seat = 0
        for seat in range(seat_num-1):
            if party_num >= len(results): break
            if seats[results[party_num][0]] > 0:
                print(".", end = "") # printing a seat
                cur_seat += 1
                seats[results[party_num][0]] -= 1
                if cur_seat >= seat_num/rows:
                    cur_seat = 0
                    print("\n", end="")

            else:
                if party_num == 0:
                    print("\n - Opposition:")
                party_num += 1




    else: pass
# running main program
results = run(data, CANDIDATES, VOTING_DEMOS[COUNTRY]['pop'], r_count)

if mode in ["RUNOFF"]:

    new_again = True
    runoff_counter = r_count if len(CANDIDATES) > r_count else len(CANDIDATES)-1

    while results[0][1]/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) < 0.5: # if nobody has a majority:

        # print plurality winner
        print(f"{results[0][0].party} {('(led by ' + results[0][0].name + ')') if (results[0][0].name!='') else ''} won a plurality by a margin of {round((results[0][1]-results[1][1])/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) * 100, 2)}% ({format_votes(results[0][1]-results[1][1])} votes)!")
        print("No candidate has received a majority. The election will proceed to another round.")
        input()

        mpl.clf()
        mpl.cla()
        mpl.close()
        not_voted = 0 # reset not voted


        # save old results as a dictionary
        old_results = {RESULTS[x][0] : RESULTS[x][1] for x in range(len(RESULTS))}

        new_cands = [x[0] for x in results[:runoff_counter]] # knockout the lowest candidate
        for x in range(len(new_cands)): # reset candidate ids
            new_cands[x].id = x

        RESULTS = [] # reset RESULTS
        for cand in new_cands:
            RESULTS.append([cand, 0])

        ys = {}
        for m in range(len(new_cands)):
            ys[new_cands[m]] = []; # set y value to 0

        results = run(data, new_cands, VOTING_DEMOS[COUNTRY]['pop']) # run the elections again
        runoff_counter -= 1
        print_final_results(RESULTS, False, old_results)


    print(f"\n{results[0][0].party} {('(led by ' + results[0][0].name + ')') if (results[0][0].name!='') else ''} won the election by a margin of {round((results[0][1]-results[1][1])/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) * 100, 2)}% ({format_votes(results[0][1]-results[1][1])} votes) with a majority by a margin of {round((results[0][1]/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) - 0.5)*100, 2)}% ({format_votes(results[0][1]-(int(round(VOTING_DEMOS[COUNTRY]['pop']-not_voted)/2)))} votes)!")
    print_gov_ideology(results, [results[0][0]])
    input()
    mpl.clf()
    mpl.cla()
    mpl.close()
    #print_parliament(results, [results[0][0]])
    #TODO not print parliament because runoff presidential

elif mode in ["FPTP"]:

    for c in CANDIDATES:
        c.party_pop *= 5  # make party size 3 times more affecting for FPTP



    if results[0][1]/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) > 0.5: # if the leader has a majority:
        print(f"\n{results[0][0].party} {('(led by ' + results[0][0].name + ')') if (results[0][0].name!='') else ''} won the election by a margin of {round((results[0][1]-results[1][1])/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) * 100, 2)}% ({format_votes(results[0][1]-results[1][1])} votes) with a majority by a margin of {round((results[0][1]/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) - 0.5)*100, 2)}% ({format_votes(results[0][1]-(int(round(VOTING_DEMOS[COUNTRY]['pop']-not_voted)/2)))} votes)!")
    else: # if just plurality
        print(f"\n{results[0][0].party} {('(led by ' + results[0][0].name + ')') if (results[0][0].name!='') else ''} won the election by a margin of {round((results[0][1]-results[1][1])/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) * 100, 2)}% ({format_votes(results[0][1]-results[1][1])} votes)!")
    print_gov_ideology(results, [results[0][0]])
    print_parliament(results, [results[0][0]])
    input()
    mpl.clf()
    mpl.cla()
    mpl.close()

elif mode in ["PROP REP"]:

    if results[0][1]/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) > 0.5: # if the leader has a majority:
        print(f"\n{results[0][0].party} {('(led by ' + results[0][0].name + ')') if (results[0][0].name!='') else ''} won the election by a margin of {round((results[0][1]-results[1][1])/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) * 100, 2)}% ({format_votes(results[0][1]-results[1][1])} votes) with a majority by a margin of {round((results[0][1]/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) - 0.5)*100, 2)}% ({format_votes(results[0][1]-(int(round(VOTING_DEMOS[COUNTRY]['pop']-not_voted)/2)))} votes)!")
        print_gov_ideology(results, [results[0][0]])
        print_parliament(results, [results[0][0]])
    else:  # FORM COALITION
        print(f"{results[0][0].party} {('(led by ' + results[0][0].name + ')') if (results[0][0].name!='') else ''} won a plurality by a margin of {round((results[0][1]-results[1][1])/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) * 100, 2)}% ({format_votes(results[0][1]-results[1][1])} votes)!")
        print("No candidate has received a majority. A coalition will be formed.")

        input("[...Continue...]")

        leader, coal = coalition(results[0][0], RESULTS)
        os.system('cls' if os.name == 'nt' else 'clear') # clear and then ask
        if coal != []: # if a coalition was formed:

            print(f"\n{leader.party}{(' (led by ' + leader.name + ')') if (leader.name!='') else ''} formed a coalition with:")
            for p in coal:
                print(f"> {p.party} {('(' + p.name + ')') if (p.name!='') else ''}")
            print(f"to form a government.")
            print_gov_ideology(results, ([leader] + coal))
            print_parliament(results, ([leader] + coal))

        else:
            print(f"No parties could reach a coalition agreement.")

            try:
                hos = VOTING_DEMOS[COUNTRY]['hos']
            except KeyError:
                hos = "the Head of State"
            print("A minority government will be formed.") # take away
            #print(f"The goverment has been dissolved by {hos}. Run new elections.") # put back
            mpl.clf()
            mpl.cla()
            mpl.close()
            if first_partners == None: first_partners = []
            if not first_leader: first_leader = results[0][0]
            print_gov_ideology(results, ([first_leader] + first_partners))
            print_parliament(results, ([first_leader] + first_partners))
            input()
            exit()

            print("The election will proceed to a 2 round runoff.")
            input()

            not_voted = 0 # reset not voted

            # save old results as a dictionary
            old_results = {RESULTS[x][0] : RESULTS[x][1] for x in range(len(RESULTS))}

            new_cands = [x[0] for x in results[:2]] # knockout the lowest candidate
            for x in range(len(new_cands)): # reset candidate ids
                new_cands[x].id = x

            RESULTS = [] # reset RESULTS
            for cand in new_cands:
                RESULTS.append([cand, 0])


            results = run(data, new_cands, VOTING_DEMOS[COUNTRY]['pop']) # run the elections again
            print_final_results(RESULTS, False, old_results)
        mpl.clf()
        mpl.cla()
        mpl.close()

input()
mpl.clf()
mpl.cla()
mpl.close()
