import random, math, os, numpy, difflib
import poli_sci_kit as psk
from poli_sci_kit import appointment

from time import sleep
import matplotlib.pyplot as mpl
mpl.ion()

DEBUG = False # print debug statements
POLL_COUNTER = 400 # poll times (500 default)
new_again = False
TOO_FAR_DISTANCE = 185 # Non-voter distance, (Higher number -> More voters) (adjust when add more values)
COALITION_FACTOR = 1.2 # 1.55 Tolerance for coalition partners for Prop Rep (Higher number -> higher tolerance for coalitions)
#1.55 old /
TOO_CLOSE_PARTY = 90 # 80 Initial Party Merging (Higher number -> more merging)
RAND_PREF_EFFECT = 0.7 # 0.85 Effect of the random region on voting (Higher number / closer to 1 -> less effect)



VALUES = [
    "prog_cons",
    "nat_glob",
    "env_eco",
    "soc_cap",
    "pac_mil",
    "auth_ana",
    "rel_sec"
]

class Candidate:
    # -10 -> 10
    # progressive - conservative
    # nationalist - globalist
    # environmentalist - economist
    # socialist - capitalist
    def __init__(self, id, name, party, party_pop, prog_cons, nat_glob, env_eco, soc_cap, pac_mil, auth_ana, rel_sec, colour=None):
        self.colour = colour
        self.id = id
        self.name = name
        self.party = party
        self.party_pop = (party_pop)
        self.vals = [prog_cons, nat_glob, env_eco, soc_cap, pac_mil, auth_ana, rel_sec]

DESCRIPTORS = {
    "prog_cons": {-100: "very progressive", -30: "progressive", 30:"conservative", 100: "ultraconservative"},
    "nat_glob": {-100: "ultranationalist", -50: "nationalist", 0 : None, 50:"globalist", 100: "internationalist"},
    "env_eco": {-100: "environmentalist", 0:None, 100: "anti-environmentalist"},
    "soc_cap" : {-60: "communist", -40: "socialist", -20: "left-leaning", 30:"right-leaning", 100: "corporatist"},
    "pac_mil" : {-100: "pacifist", 20:None, 70: "militarist", 100: "ultramilitaristic"},
    "auth_ana" : {-100: "dictatorial", -50: "authoritarian", 0: None, 30:"liberal", 100: "anarchist"},
    "rel_sec": {-100: "theocratic", -60: "religious", 0:None, 100: "secular"},
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

            #euc_dist /= ((RESULTS[i][1]+1 / 100000))
            dists.append(euc_dist) # add to distance list


        dists[rand_pref] *= RAND_PREF_EFFECT # 0.85 by random preference of party
        index_min = min(range(len(dists)), key=dists.__getitem__) # find preferred candidate by closest distance
        if dists[index_min] <= TOO_FAR_DISTANCE**2: # if close enough to vote for them:
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
def print_results(RESULTS, rand_pref, way):
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
                mpl.plot(ys_values[x], ys_keys[x].colour, label= lab + ys_keys[x].party + ((" - !MAJORITY!" if v>50 else (" - !PREDICTED WINNING!" if (ys_values[x][-1] > 50) else "")))) # legend label
            else: # if no colour
                mpl.plot(ys_values[x], label= lab + ys_keys[x].party + (" - !WON!" if v>50 else "")) # legend label


        #reverse list of orders (because top down for percentage)
        handles, labels = mpl.gca().get_legend_handles_labels()
        mpl.legend([handles[idx] for idx in order],[labels[idx] for idx in order], loc="upper left", prop={'family': 'monospace'}) #order the legend

        #mpl.title((COUNTRY + " Election Polling").title().ljust(20) + str.rjust(str.ljust(str(round(total, 2)) + "%", 8), 4, '0'))
        mpl.title((COUNTRY + " Election Polling - ").title().ljust(20) + str.rjust(str.ljust(str(round((100-total)/2)) + " days until Election Day", 8), 4, '0'))
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
    print_results(RESULTS, rand_pref, way)
    mpl.pause(0.5)

    global STORED_RESULTS
    STORED_RESULTS = None
    res = sorted(RESULTS,key=lambda l:l[1], reverse=True) # sort by vote count
    os.system('cls' if os.name == 'nt' else 'clear')
    print(COUNTRY + " - " + mode + "\n")
    for i in range(len(res)):
        if not first: # print with the percentage change
            print(f"{str.ljust(res[i][0].name, 20)} {str.ljust(res[i][0].party, 20)} : {str.ljust(str(round(res[i][1]/(VOTING_DEMOS[COUNTRY]['pop']-not_voted)*100, 2))+'%', 8)} {str.ljust(('[▴' if (res[i][1]-old_res[res[i][0]])/(VOTING_DEMOS[COUNTRY]['pop']-not_voted)>0 else '[▾') + str(round(abs(res[i][1]-old_res[res[i][0]])/(VOTING_DEMOS[COUNTRY]['pop']-not_voted)*100, 2)) + '%]', 10)}: {format_votes(res[i][1])} votes " )
        else:
            print(f"{str.ljust(res[i][0].name, 20)} {str.ljust(res[i][0].party, 20)} : {str.ljust(str(round(res[i][1]/(VOTING_DEMOS[COUNTRY]['pop']-not_voted)*100, 2))+'%', 8)} : {format_votes(res[i][1])} votes " )
    print()
    print()
    print(f"{str.ljust('Turnout', 52)} : {round((VOTING_DEMOS[COUNTRY]['pop']-not_voted) / (VOTING_DEMOS[COUNTRY]['pop']) * 100, 1)}%")
    print(f"{str.ljust('Not voted', 52)} : {format_votes(not_voted)}")
    print()

regions = []
def run(data, cands, pop):
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

        if it % (pop//(POLL_COUNTER) + 1) == 0:
            print_results(RESULTS, rand_pref, it/pop)
            sleep(DELAY)

        if it in regions:
            # pick a new region
            cand_numbers.pop(cand_numbers.index(rand_pref))
            if len(cand_numbers) != 0:
                random.seed() # seeding to make a proper random choice
                rand_pref = random.choice(cand_numbers)


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
                euc_dist += percs[i]*100 # add party vote from distance (prefer less voted parties)
                pass
            dists.append(euc_dist) # add to distance list

        # calculating from distance which partners to have
        partners = []
        cur_dists = dists
        #print(dists)
        #print([x.party for x in parties_in_order])
        input()

        while perc < 0.5: # while do not have a majority go through the list of parties:

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
                sleep(0.5)
                input("[...Continue...]")

            os.system('cls' if os.name == 'nt' else 'clear') # clear and then ask
            print(f"Current Coalition Vote Percentage: {round(perc*100, 1)}%")
            print(f"Current Coalition Leader: {new_leader.party}")
            print(f"Members: ")
            for x in partners:
                print(f"> {x.party}")
            sleep(1)
        if perc > 0.5:
            majority = True

    sleep(1)
    return (new_leader, partners)



# ~~~~~~~~~~ CUSTOM USER COUNTRIES ~~~~~~~~~~~~

VOTING_DEMOS = {
    #COUNTRY: [pop in hundreds]
    "UK": {"pop": 70_029, "vals": {
                "prog_cons": -5,
                "nat_glob": -15,
                "env_eco": 35,
                "soc_cap":  15,
                "pac_mil": -24,
                "auth_ana": -17,
                "rel_sec": -23},
                "scale":1000,
                "hos":"King Charles III"},

    "GERMANY 1936": {"pop": 61_024, "vals":{
                "prog_cons": 95,
                "nat_glob": -68,
                "env_eco": 64,
                "soc_cap":  4,
                "pac_mil": 78,
                "auth_ana": -56,
                "rel_sec": -56},
                "scale":1000,
                "hos":"Paul von Hindenburg"},
    "GERMANY" : {"pop" : 85_029, "vals" : {
                "prog_cons": -12,
                "nat_glob": 34,
                "env_eco": 24,
                "soc_cap":  12,
                "pac_mil": 24,
                "auth_ana": -1,
                "rel_sec": -12},
                "scale":1000,
                "hos":"Frank-Walter Steinmeier"},
    "HAMPTON": {"pop": 1_546, "vals": {
                "prog_cons": 21,
                "nat_glob": 0,
                "env_eco": -12,
                "soc_cap":  52,
                "pac_mil": -23,
                "auth_ana": -30,
                "rel_sec": 29},
                "scale":1,
                "hos":"Kevin Knibbs"},
    "DENMARK": {"pop": 50_843, "vals": {
                "prog_cons": -34,
                "nat_glob": 46,
                "env_eco": 0,
                "soc_cap":  -2,
                "pac_mil": -21,
                "auth_ana": 42,
                "rel_sec": 64},
                "scale":100,
                "hos":"Frank-Walter Steinmeier"},
    "NORTH KOREA": {"pop": 25_083, "vals" : {
                "prog_cons": 56,
                "nat_glob": -99,
                "env_eco": 35,
                "soc_cap":  -105,
                "pac_mil": 70,
                "auth_ana": -98,
                "rel_sec": 99},
                "scale":1000},
    "SOVIET UNION 1991": {"pop": 230_83, "vals" : {
                "prog_cons": 56,
                "nat_glob": 0,
                "env_eco": 35,
                "soc_cap":  -61,
                "pac_mil": 70,
                "auth_ana": -38,
                "rel_sec": 71},
                "scale":10000},
    "USA" : {"pop": 350_00, "vals" : {
                "prog_cons": 20,
                "nat_glob": -35,
                "env_eco": 20,
                "soc_cap":  70,
                "pac_mil": 60,
                "auth_ana": 12,
                "rel_sec": -31},
                "scale":10000,
                "hos":"Chief Justice John Roberts"},
    "TURKEY" : {"pop": 87_000, "vals" : {
                "prog_cons": 38,
                "nat_glob": -24,
                "env_eco": 21,
                "soc_cap":  65,
                "pac_mil": 34,
                "auth_ana": -12,
                "rel_sec": 22},
                "scale":1000},
    "FINLAND" : {"pop": 55_410, "vals" : {
                "prog_cons": -2,
                "nat_glob": 10,
                "env_eco": 12,
                "soc_cap":  -1,
                "pac_mil": 12,
                "auth_ana": 12,
                "rel_sec": 45},
                "scale":100,
                "hos":"Sauli Niinosto"},
    "RUSSIA" : {"pop": 143_00, "vals": {
                "prog_cons": 43,
                "nat_glob": -62,
                "env_eco": 71,
                "soc_cap":  0,
                "pac_mil": 75,
                "auth_ana": -61,
                "rel_sec": -31},
                "scale":10000,
                "hos":"Vladimir Putin"},
    "SOMALIA" : {"pop" : 17_000, "vals": {
                "prog_cons": 76,
                "nat_glob": -46,
                "env_eco": 19,
                "soc_cap":  -15,
                "pac_mil": 89,
                "auth_ana": -17,
                "rel_sec": -64},
                "scale":1000},
    "IRELAND" : {"pop": 60_12, "vals": {
                "prog_cons": 5,
                "nat_glob": -1,
                "env_eco": 32,
                "soc_cap":  14,
                "pac_mil": 12,
                "auth_ana": -4,
                "rel_sec": -41},
                "scale":1000,
                "hos":"Michael Higgins"},
    "AUSTRIA" : {"pop": 9_212, "vals": {
            "prog_cons": 25,
            "nat_glob": -16,
            "env_eco": 2,
            "soc_cap":  54,
            "pac_mil": 0,
            "auth_ana": -4,
            "rel_sec": -32},
            "scale":1000,
            "hos":"Alexander van der Bellen"},
    "FRANCE" : {"pop": 67_212, "vals": {
            "prog_cons": 25,
            "nat_glob": -26,
            "env_eco": 2,
            "soc_cap":  0,
            "pac_mil": 12,
            "auth_ana": -12,
            "rel_sec": 0},
            "scale":1000,},
    "EU" : {"pop": 44_812, "vals": {
            "prog_cons": 12,
            "nat_glob": 3,
            "env_eco": 2,
            "soc_cap":  22,
            "pac_mil": 2,
            "auth_ana": -3,
            "rel_sec": -1},
            "scale":10000,},
    "SPAIN" : {"pop": 47_421, "vals": {
            "prog_cons": 5,
            "nat_glob": 1,
            "env_eco": 3,
            "soc_cap":  2,
            "pac_mil": 1,
            "auth_ana": -4,
            "rel_sec": 2},
            "scale":1000,},
    "KRESIMIRIA" : {"pop": 80_21, "vals": {
            "prog_cons": 25,
            "nat_glob": 26,
            "env_eco": -23,
            "soc_cap":  -12,
            "pac_mil": 51,
            "auth_ana": -32,
            "rel_sec": -90},
            "scale":10000,},
    "SORDLAND" : {"pop": 35_12, "vals": {
            "prog_cons": 33,
            "nat_glob": -5,
            "env_eco": 12,
            "soc_cap":  -5,
            "pac_mil": 22,
            "auth_ana": -4,
            "rel_sec": -4},
            "scale":10000,
            "hos":"General Iosef Lancea"},
}

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
        Candidate(0, "Rishi Sunak", "Conservative", 8, 65, -24, 76, 71, -2, -21, 11,
            colour="blue"),
        Candidate(1, "Ed Davey", "Liberal Democrats", 1, 2, -1, 24, 41, -40, -6, 31,
            colour="gold"),
        Candidate(2, "Keir Starmer", "Labour", 10, 1, 41, -11, 14, 4, -1, 74,
            colour="red"),
        Candidate(5, "Hannah Sell", "Socialist Party", 1, -10, -11, 23, -41, -30, -5, 86,
            colour="firebrick"),
        Candidate(3, "Carla Denyer", "Green Party", 1, -37, 31, -54, -31, -10, 31, 13,
            colour="green"),
        Candidate(4, "Nigel Farage", "Reform Party", 2, 95, -98, 65, 70, 90, -42, -3,
            colour="black"),
        Candidate(5, "Jeremy Corbyn", "Corbyn's Alternative", 0.5, -50, 30, -40, -50, -10, -13, 95,
            colour="purple"),
    ],
    "US PRIMARIES": [
        Candidate(0, "Donald Trump", "Donald Trump", 10,
                colour = "red",
                prog_cons = 60,
                nat_glob = -40,
                env_eco = 40,
                soc_cap =  95,
                pac_mil= 40,
                auth_ana= -63,
                rel_sec = -12),
        Candidate(1, "Ron DeSantis", "Ron DeSantis", 10,
                colour = "blue",
                prog_cons = 80,
                nat_glob = -50,
                env_eco = 50,
                soc_cap =  95,
                pac_mil= 60,
                auth_ana= -73,
                rel_sec = -52),
        Candidate(1, "Nikki Haley", "Nikki Haley", 10,
                colour = "yellow",
                prog_cons = 40,
                nat_glob = -30,
                env_eco = 40,
                soc_cap =  95,
                pac_mil= 30,
                auth_ana= -53,
                rel_sec = -2),
        Candidate(1, "Chris Christie", "Chris Christie", 10,
                colour = "green",
                prog_cons = 40,
                nat_glob = -30,
                env_eco = 50,
                soc_cap =  75,
                pac_mil= 30,
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
                pac_mil= 40,
                auth_ana= -63,
                rel_sec = -12),
        Candidate(1, "Joe Biden", "Democratic Party", 10,
                colour = "blue",
                prog_cons = -10,
                nat_glob = 0,
                env_eco = 30,
                soc_cap = 48,
                pac_mil= 10,
                auth_ana= -22,
                rel_sec = 3),
        Candidate(2, "Jo Jorgensen", "Libertarian Party", 1,
                colour = "orange",
                prog_cons = 30,
                nat_glob = 0,
                env_eco = 90,
                soc_cap = 90,
                pac_mil= -10,
                auth_ana= 72,
                rel_sec = 4),
        Candidate(2, "Joe Sims", "CPUSA", 0.1,
                colour = "red",
                prog_cons = -30,
                nat_glob = -40,
                env_eco = -10,
                soc_cap = -90,
                pac_mil= 40,
                auth_ana= -72,
                rel_sec = 76),
        Candidate(3, "Howie Hawkins", "Green Party of USA", 1, -40, 35, -85, -10, -50, -21, 65, "green"),
        Candidate(4, "Ron Edwards", "Christian C. Party", 1, 200, -50, 0, -20, 80, -67, -90, "black")
    ],
    "GERMANY 1936": [
        Candidate(0, "Otto Wels", "SPD", 7, 12, -35, 24, -21, 36, 4, 12),
        Candidate(1, "Hadolf Itler", "NDSAP", 7, 150, -78, -1, 45, 86, -86, -45),
        Candidate(3, "Ernst Thalman", "KPD", 7, 57, -56, 24, -77, 78, 23, 41),
        Candidate(0, "Ludwig Kaas", "Centre", 7, 0, -12, 41, 12, 6, -12, 13),
    ],
    "NORTH KOREA": [
        Candidate(0, "Kim Jong-Un", "Fatherland Front", 11, 59, -90, 23, -99, 90, -99, 100),
        Candidate(1, "Kim Ho-Chol", "Social Democrat Party", 1, -20, -20, -20, -60, 50, -52, 100)
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
        Candidate(8, "Vladimir Putin", "United Russia", 10,
                prog_cons= 55,
                nat_glob= -60,
                env_eco= 32,
                soc_cap= 12,
                pac_mil=  65,
                auth_ana= -65,
                rel_sec = -50,
                colour='blue'),
        Candidate(6, "Gennady Zyuganov", "Communist Party of Russia", 4,
                prog_cons= 34,
                nat_glob= -12,
                env_eco= 0,
                soc_cap= -95,
                pac_mil=  45,
                auth_ana= -94,
                rel_sec = 87,
                colour="red"),
        Candidate(6, "Sergey Mironov", "A Just Russia", 1,
                prog_cons= 34,
                nat_glob= -12,
                env_eco= 45,
                soc_cap= 12,
                pac_mil=  45,
                auth_ana= -74,
                rel_sec = 12),
        Candidate(6, "Leonid Slutsky", "Liberal Democrats", 1,
                prog_cons= 85,
                nat_glob= -97,
                env_eco= 63,
                soc_cap= 0,
                pac_mil=  84,
                auth_ana= -74,
                rel_sec = -89),
    ],
    "SOVIET UNION 1991" : [
        Candidate(8, "Mikhail Gorbachev", "Communist Party of the Soviet Union", 10,
                prog_cons= -34,
                nat_glob= 12,
                env_eco= 0,
                soc_cap= -85,
                pac_mil=  45,
                auth_ana= -84,
                rel_sec = 87,
                colour="red"),

        Candidate(6, "Boris Yeltsin", "Democratic Union", 4,
                prog_cons= 21,
                nat_glob= -12,
                env_eco= 0,
                soc_cap= -12,
                pac_mil=  35,
                auth_ana= -14,
                rel_sec = 37),
        Candidate(6, "Nikolay Lysenko", "National Republican Party", 3,
                prog_cons= 84,
                nat_glob= -12,
                env_eco= 0,
                soc_cap= -62,
                pac_mil=  45,
                auth_ana= -74,
                rel_sec = -82),
    ],
    "HAMPTON" : [
        Candidate(8, "James Greenfield", "KPD", 5,
            prog_cons= -10,
            nat_glob= -60,
            env_eco= 0,
            soc_cap= -100,
            pac_mil=  35,
            auth_ana= -85,
            rel_sec = 95,
            colour="red"),

        Candidate(6, "Danil Eliasov, Billiam the Third and Luc Mason", "4C Yes Please", 5, #4C Please = CCC + Confetto + Yes Please
            prog_cons= 75,
            nat_glob= -75,
            env_eco= 73,
            soc_cap= 86,
            pac_mil=  0,
            auth_ana= -72,
            rel_sec = 62),

        Candidate(8, "Mehmet Altinel, Emperor Karl, and Alex Wicks", "National Imperial Front", 5, #= Nation First + Front + Imperius
            prog_cons= 55,
            nat_glob= -75,
            env_eco= 65,
            soc_cap= 81,
            pac_mil= 72,
            auth_ana= -63,
            rel_sec = -62),
        Candidate(1, "Zac Nolan", "P&P", 5,  # P&P + MRL
            prog_cons= -21,
            nat_glob= 39,
            env_eco= -1,
            soc_cap= -2,
            pac_mil= -5,
            auth_ana= 14,
            rel_sec = 12,
            colour="skyblue"),
        Candidate(3, "F.W. Barkson", "FEC", 2,  # P&P + MRL
            prog_cons= -1,
            nat_glob= 49,
            env_eco= 13,
            soc_cap= -10,
            pac_mil= 5,
            auth_ana= 4,
            rel_sec = 9,
            colour="darkblue"),
        Candidate(7, "Theo Evison", "Prevalence", 5, # Prevalence
            prog_cons= 27,
            nat_glob= -15,
            env_eco= 40,
            soc_cap= 61,
            pac_mil=  12,
            auth_ana= -51,
            rel_sec = 0,
            colour="purple"),

        Candidate(12, "William Greenfield", "Economic Reformists", 5,
            prog_cons= 80,
            nat_glob= 100,
            env_eco= 100,
            soc_cap= 100,
            pac_mil= 0,
            auth_ana= 90,
            rel_sec = 0),

        Candidate(12, "Jasper de Linde", "Harpargus Hegemony", 10,
            prog_cons= -75,
            nat_glob= -50,
            env_eco= -5,
            soc_cap= -20,
            pac_mil= 100,
            auth_ana= -10,
            rel_sec = 100),
    ],
    "GERMANY" : [
        Candidate(0, "Olaf Scholz", "SPD", 10,
                prog_cons= -31,
                nat_glob= 45,
                env_eco= 3,
                soc_cap= -4,
                pac_mil= 12,
                auth_ana= 12,
                rel_sec = 25,
                colour="red"),
        Candidate(1, "Friedrich Merz", "CDU", 10,
                prog_cons= 24,
                nat_glob= 44,
                env_eco= 14,
                soc_cap= 24,
                pac_mil= 10,
                auth_ana= -12,
                rel_sec = -12,
                colour="black"),
        Candidate(3, "Ricarda Lang", "Alliance 90", 5,
                prog_cons= -35,
                nat_glob= 45,
                env_eco= -45,
                soc_cap= -1,
                pac_mil= -23,
                auth_ana= 34,
                rel_sec = 54),
        Candidate(4, "Tino Chrupalla", "AfD", 3,
                prog_cons= 78,
                nat_glob= -45,
                env_eco= 45,
                soc_cap= 45,
                pac_mil= 45,
                auth_ana= -45,
                rel_sec = -12),
    ],
    "RADICALS" : [
        Candidate(0, "Karl Max", "Maxists (P)", 5,
                prog_cons=-100,
                nat_glob= 100,
                env_eco= -100,
                soc_cap= -100,
                pac_mil= -100,
                auth_ana= 100,
                rel_sec = 100),
        Candidate(0, "Adam Smith", "Radical Centrist Party", 5,
                prog_cons=0,
                nat_glob= 00,
                env_eco= 00,
                soc_cap= 00,
                pac_mil= 00,
                auth_ana= 00,
                rel_sec = 00),
        Candidate(0, "Jonathan Gotlor", "Gotlorite Front", 5,
                prog_cons=100,
                nat_glob= -100,
                env_eco= 100,
                soc_cap= 100,
                pac_mil= 100,
                auth_ana= -100,
                rel_sec = -100),
    ],
    "IRELAND" : [
        Candidate(0, "Michael Martin", "Fianna Fail", 10,
                prog_cons= 41,
                nat_glob= 12,
                env_eco= 34,
                soc_cap= 45,
                pac_mil= 12,
                auth_ana= -4,
                rel_sec = -31),
        Candidate(1, "Mary Lou McDonald", "Sinn Fein", 9,
                prog_cons= -31,
                nat_glob= 43,
                env_eco= 31,
                soc_cap= -32,
                pac_mil= 31,
                auth_ana= 35,
                rel_sec = -54),
        Candidate(3, "Leo Varadkar", "Fine Gael", 10,
                prog_cons= 32,
                nat_glob= -12,
                env_eco= 30,
                soc_cap= 65,
                pac_mil= -12,
                auth_ana= -10,
                rel_sec = -21),
        Candidate(4, "Eamon Ryan", "Irish Greens", 3,
                prog_cons= -45,
                nat_glob= 41,
                env_eco= -46,
                soc_cap= -4,
                pac_mil= -31,
                auth_ana= 29,
                rel_sec = 45),
        Candidate(4, "", "Workers' Party", 0.1,
                prog_cons= 15,
                nat_glob= -61,
                env_eco= -46,
                soc_cap= -92,
                pac_mil= 12,
                auth_ana= -51,
                rel_sec = 98),
    ],
    "TURKEY" : [
        Candidate(3, "Recep Erdogan", "AK", 9,
                prog_cons= 56,
                nat_glob= -35,
                env_eco= 23,
                soc_cap= 65,
                pac_mil= 31,
                auth_ana= -94,
                rel_sec = -64),
        Candidate(4, "Kemal Kilicdaroglu", "Republican People's Party", 9,
                prog_cons= -12,
                nat_glob= -12,
                env_eco= -46,
                soc_cap= -4,
                pac_mil= -31,
                auth_ana= -12,
                rel_sec = 53),
        Candidate(4, "Mithat Sancar", "Democratic Party", 2,
                prog_cons= -45,
                nat_glob= 41,
                env_eco= -46,
                soc_cap= -4,
                pac_mil= -31,
                auth_ana= 29,
                rel_sec = 87,
                colour="blue"),
        Candidate(4, "Devlet Bahceli", "Nationalist Movement", 2,
                prog_cons= 85,
                nat_glob= -51,
                env_eco= 16,
                soc_cap= -4,
                pac_mil= 61,
                auth_ana= -29,
                rel_sec = -78),
    ],
    "NOLANS" : [
        Candidate(0, "Zac Nolan", "Federalist Party", 2,
                prog_cons= -60,
                nat_glob= 30,
                env_eco= -5,
                soc_cap= 15,
                pac_mil= -10,
                auth_ana= -15,
                rel_sec = 85),
        Candidate(1, "Juliet Nolan", "The Greens", 2,
                prog_cons= -80,
                nat_glob= 65,
                env_eco= -95,
                soc_cap= -45,
                pac_mil= 0,
                auth_ana= 75,
                rel_sec = 95),
        Candidate(2, "Dale Nolan", "Status", 2,
                prog_cons= -12,
                nat_glob= -1,
                env_eco= -4,
                soc_cap= 62,
                pac_mil= 45,
                auth_ana= -12,
                rel_sec = 2),
    ],
    "AUSTRIA" : [
        Candidate(8, "Karl Nehammer", "ÖVP", 10,
                prog_cons= 55,
                nat_glob= -30,
                env_eco= -2,
                soc_cap= 65,
                pac_mil=  15,
                auth_ana= -25,
                rel_sec = -50),
        Candidate(6, "Werner Kogler", "Die Grune", 6,
                prog_cons= -2,
                nat_glob= 23,
                env_eco= -82,
                soc_cap= -2,
                pac_mil=  0,
                auth_ana= 39,
                rel_sec = 12),
        Candidate(6, "Andreas Babler", "SPÖ", 10,
                prog_cons= -14,
                nat_glob= 12,
                env_eco= -5,
                soc_cap= -2,
                pac_mil=  5,
                auth_ana= 2,
                rel_sec = 23),
        Candidate(6, "Herbet Kickl", "FPÖ", 1,
                prog_cons= 75,
                nat_glob= -65,
                env_eco= 63,
                soc_cap= -3,
                pac_mil=  84,
                auth_ana= -71,
                rel_sec = -45),
        Candidate(6, "Beta Reisinger", "NEOS", 1,
                prog_cons= 13,
                nat_glob= -65,
                env_eco= 93,
                soc_cap= 89,
                pac_mil=  0,
                auth_ana= 12,
                rel_sec = 0),
        Candidate(9, "Kurt Murfelfitz", "KPÖ", 1,
                prog_cons= 5,
                nat_glob= -85,
                env_eco= -2,
                soc_cap= -92,
                pac_mil=  45,
                auth_ana= -72,
                rel_sec = 98),
        Candidate(10, "Ferdi Habsburg-Lorraine", "Die Monarchisten", 1,
                prog_cons= 95,
                nat_glob= -45,
                env_eco= -2,
                soc_cap= 64,
                pac_mil=  45,
                auth_ana= -100,
                rel_sec = -40),
    ],
    "CUSTOM" : [
        Candidate(0, "", "Donald Trump", 10,
            prog_cons = 60,
            nat_glob = -40,
            env_eco = 40,
            soc_cap =  95,
            pac_mil= 40,
            auth_ana= -63,
            rel_sec = -12),
        Candidate(0, "", "Nikki Haley", 10,
            prog_cons = 59,
            nat_glob = -35,
            env_eco = 65,
            soc_cap =  85,
            pac_mil= 45,
            auth_ana= -55,
            rel_sec = -2),
    ],
    "COMBINATION": [
        Candidate(12, "Jasper de Linde", "Harpargus Hegemony", 30,
            prog_cons= -75,
            nat_glob= -50,
            env_eco= -5,
            soc_cap= -20,
            pac_mil= 100,
            auth_ana= -10,
            rel_sec = 100),
    ],
    "SOMALIA": [
        Candidate(12, "Faysal Ali Warabe", "For Justice and Development", 10,
            prog_cons= -2,
            nat_glob= -50,
            env_eco= 41,
            soc_cap= -30,
            pac_mil= 39,
            auth_ana= 40,
            rel_sec = 0),
        Candidate(12, "Muse Bihi", "Peace, Unity and Development", 10,
            prog_cons= -5,
            nat_glob= 20,
            env_eco= 12,
            soc_cap= 10,
            pac_mil= 30,
            auth_ana= -10,
            rel_sec = 40),
        Candidate(12, "Hersi Ali Hassan", "Waddani", 10,
            prog_cons= 41,
            nat_glob= -50,
            env_eco= 41,
            soc_cap= -20,
            pac_mil= 40,
            auth_ana= -30,
            rel_sec = -50),
    ],
    "FRANCE" : [
        Candidate(8, "Emmanuel Macron", "Renaissance", 7,
                prog_cons= -12,
                nat_glob= 30,
                env_eco= 13,
                soc_cap= 55,
                pac_mil=  15,
                auth_ana= -35,
                rel_sec = 54,
                colour="gold"),
        Candidate(6, "Eric Ciotti", "Les Republicains", 4,
                prog_cons= 12,
                nat_glob= -5,
                env_eco= 12,
                soc_cap= 51,
                pac_mil=  0,
                auth_ana= -39,
                rel_sec = -12,
                colour="red"),
        Candidate(6, "Marine Le Pen", "National Rally", 7,
                prog_cons= 76,
                nat_glob= -51,
                env_eco= 12,
                soc_cap= 45,
                pac_mil=  12,
                auth_ana= -10,
                rel_sec = -45,
                colour="navy"),
        Candidate(6, "Jean-Luc Melenchon", "La France Insoumise", 7,
                prog_cons= -34,
                nat_glob= -65,
                env_eco= 63,
                soc_cap= -43,
                pac_mil=  00,
                auth_ana= 23,
                rel_sec = 51,
                colour="purple"),
        Candidate(6, "Olivier Faure", "Socialistes", 1,
                prog_cons= -13,
                nat_glob= -12,
                env_eco= -23,
                soc_cap= -81,
                pac_mil=  21,
                auth_ana= -12,
                rel_sec = 72,
                colour="black"),
    ],
    "POLAND" : [
        Candidate(8, "Jaroslaw Kaczynski", "Law and Justice", 7,
                prog_cons= 42,
                nat_glob= -30,
                env_eco= 13,
                soc_cap= 0,
                pac_mil=  15,
                auth_ana= -45,
                rel_sec = -34,
                colour="blue"),
        Candidate(6, "Donald Tusk", "Civic Platform", 7,
                prog_cons= 2,
                nat_glob= 35,
                env_eco= 52,
                soc_cap= 51,
                pac_mil=  0,
                auth_ana= -19,
                rel_sec = 2,
                colour="gold"),
        Candidate(6, "Szymon Holownia", "Poland 2050", 4,
                prog_cons= -6,
                nat_glob= 31,
                env_eco= -41,
                soc_cap= 5,
                pac_mil=  -12,
                auth_ana= 30,
                rel_sec = 45,
                colour="green"),
        Candidate(6, "Wladyslaw Koziniak-Kamysz", "People's Party", 2,
                prog_cons= 44,
                nat_glob= 15,
                env_eco= 63,
                soc_cap= 43,
                pac_mil=  12,
                auth_ana= -23,
                rel_sec = -61,
                colour="purple"),
        Candidate(6, "Robert Biedron", "New Left", 1,
                prog_cons= -43,
                nat_glob= 12,
                env_eco= -3,
                soc_cap= -41,
                pac_mil=  21,
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
            pac_mil= 61,
            auth_ana= -63,
            rel_sec = -98),
        Candidate(0, "Pope Raleigh VII", "Caeserin Front", 10,
            prog_cons = -39,
            nat_glob = -35,
            env_eco = 12,
            soc_cap = 12,
            pac_mil= 87,
            auth_ana= -85,
            rel_sec = -87),
        Candidate(0, "Counts of Knin", "Liberty Alliance", 3,
            prog_cons = 39,
            nat_glob = -35,
            env_eco = 12,
            soc_cap = 12,
            pac_mil= 61,
            auth_ana= 45,
            rel_sec = 57),
        Candidate(0, "Duke Zvonomir", "Stability - PSO", 3,
            prog_cons = -59,
            nat_glob = 35,
            env_eco = -42,
            soc_cap = -45,
            pac_mil= -10,
            auth_ana= -10,
            rel_sec = -76),
    ],
    "SORLAND" : [
        Candidate(0, "Tarquin Soll", "United Sordland Party", 10,
            prog_cons = 30,
            nat_glob = -30,
            env_eco = -11,
            soc_cap =  -51,
            pac_mil= 12,
            auth_ana= -61,
            rel_sec = 24),
        Candidate(0, "Frens Richter", "PFJP", 7,
            prog_cons = -21,
            nat_glob = -1,
            env_eco = 0,
            soc_cap = 12,
            pac_mil= 4,
            auth_ana= 2,
            rel_sec = 1),
        Candidate(0, "Kesaro Kibener", "National Front", 3,
            prog_cons = 76,
            nat_glob = -95,
            env_eco = 35,
            soc_cap = 12,
            pac_mil= 61,
            auth_ana= -75,
            rel_sec = -67),
        Candidate(0, "Malenyevists", "Kommuniste Parte", 3,
            prog_cons = -12,
            nat_glob = -45,
            env_eco = -42,
            soc_cap = -98,
            pac_mil= 12,
            auth_ana= -20,
            rel_sec = 86),
    ],
    "SPAIN" : [
        Candidate(8, "Alberto Nunez Felijoo", "People's Party", 10,
                prog_cons= 34,
                nat_glob= -12,
                env_eco= 34,
                soc_cap= 55,
                pac_mil=  3,
                auth_ana= -12,
                rel_sec = -12,
                colour="blue"),
        Candidate(6, "Pedro Sanchez", "PSOE", 10,
                prog_cons= -21,
                nat_glob= 12,
                env_eco= 1,
                soc_cap= 4,
                pac_mil=  3,
                auth_ana= 2,
                rel_sec = 41,
                colour="red"),
        Candidate(6, "Santiago Abascal", "Vox", 3,
                prog_cons= 84,
                nat_glob= -52,
                env_eco= 41,
                soc_cap= 45,
                pac_mil=  45,
                auth_ana= -74,
                rel_sec = -82,
                colour="green"),
        Candidate(6, "Yolanda Diaz", "Unite / Podemos", 3,
                prog_cons= -45,
                nat_glob= 34,
                env_eco= -41,
                soc_cap= -42,
                pac_mil=  -45,
                auth_ana= 31,
                rel_sec = 42),
    ],
    "VENEZUELA" : [
        Candidate(0, "Nicolas Maduro", "Great Patriotic Pole", 10,
                prog_cons= 23,
                nat_glob= -44,
                env_eco= 4,
                soc_cap= -61,
                pac_mil= 5,
                auth_ana= -41,
                rel_sec = 2),
        Candidate(0, "Juan Guaido", "Popular Will", 2,
                prog_cons= -31,
                nat_glob= 31,
                env_eco= 23,
                soc_cap= 41,
                pac_mil= 12,
                auth_ana= 21,
                rel_sec = -4),
        Candidate(2, "Henry Ramos Allup", "Unitary Platform", 2,
                prog_cons= 32,
                nat_glob= 41,
                env_eco= 43,
                soc_cap= 71,
                pac_mil= 22,
                auth_ana= -1,
                rel_sec = 11),
    ],
    "OTH" : [
        Candidate(0, "Indigo Westwood", "People's Voice", 5,
                prog_cons= -41,
                nat_glob= 39,
                env_eco= -15,
                soc_cap= -2,
                pac_mil= -5,
                auth_ana= 14,
                rel_sec = 12,
                colour="skyblue"),
        Candidate(0, "Stephen Barrett", "Liberal Party", 5,
                prog_cons= 51,
                nat_glob= -51,
                env_eco= 53,
                soc_cap= 61,
                pac_mil= 42,
                auth_ana= -41,
                rel_sec = -61,
                colour="orange"),
        Candidate(2, "Sally McLaughlin", "Party for Change", 5,
                prog_cons= -32,
                nat_glob= -41,
                env_eco= 13,
                soc_cap= -71,
                pac_mil= 22,
                auth_ana= 51,
                rel_sec = 80),
        Candidate(2, "Thomas Cooke", "Renewal", 5,
                prog_cons= 92,
                nat_glob= -91,
                env_eco= 71,
                soc_cap= -5,
                pac_mil= 42,
                auth_ana= -81,
                rel_sec = 0),
    ],
    "NI" : [
        Candidate(1, "Michelle O'Neill", "Sinn Fein", 10,
                prog_cons= -31,
                nat_glob= 23,
                env_eco= 31,
                soc_cap= -22,
                pac_mil= 31,
                auth_ana= 35,
                rel_sec = -24,
                colour="green"),
        Candidate(6, "Sir Jeffrey Donaldson", "DUP", 10,
                prog_cons= 61,
                nat_glob= -52,
                env_eco= 13,
                soc_cap= 41,
                pac_mil=  31,
                auth_ana= 41,
                rel_sec = -41,
                colour="orange"),
        Candidate(6, "Naomi Long", "APNI", 3,
                prog_cons= 4,
                nat_glob= 12,
                env_eco= 41,
                soc_cap= 45,
                pac_mil= -25,
                auth_ana= 14,
                rel_sec = 72,
                colour="yellow"),
        Candidate(6, "Doug Beattie", "UUP", 1,
                prog_cons= 51,
                nat_glob= -34,
                env_eco= 61,
                soc_cap= 72,
                pac_mil=  15,
                auth_ana= -41,
                rel_sec = -42),
        Candidate(6, "Colum Eastwood", "SDLP", 3,
                prog_cons= -15,
                nat_glob= -4,
                env_eco= 11,
                soc_cap= 12,
                pac_mil=  -14,
                auth_ana= -3,
                rel_sec = 12),
    ],
    "SCHOOL COUNCIL" : [
        Candidate(1, "", "Xavier Zadeh", 10,
                prog_cons= 71,
                nat_glob= -43,
                env_eco= 31,
                soc_cap= 52,
                pac_mil= 31,
                auth_ana= -55,
                rel_sec = -24,
                colour="green"),
        Candidate(6, "", "Nolan - Evison", 10,
                prog_cons= 61,
                nat_glob= -52,
                env_eco= 13,
                soc_cap= 41,
                pac_mil=  31,
                auth_ana= 41,
                rel_sec = -41,
                colour="blue"),
        Candidate(6, "", "Christopher Blanchie", 3,
                prog_cons= -71,
                nat_glob= 61,
                env_eco= -12,
                soc_cap= -45,
                pac_mil= -25,
                auth_ana= 24,
                rel_sec = 72,
                colour="yellow"),
        Candidate(6, "", "Guy Baker", 1,
                prog_cons= -3,
                nat_glob= -14,
                env_eco= 11,
                soc_cap= 12,
                pac_mil=  15,
                auth_ana= -41,
                rel_sec = 12),
        Candidate(6, "", "Davlatsho Shirinbekov", 3,
                prog_cons= 75,
                nat_glob= -46,
                env_eco= 61,
                soc_cap= -51,
                pac_mil=  44,
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

x = 0

# merging the parties

if DEBUG: print(f"DEBUG: original value {TOO_CLOSE_PARTY}")
if DEBUG: print(f"DEBUG: number of parties {len(CAND_LIST[CHOICE])}")
if DEBUG: print(f"DEBUG:  multiplier {1+(((len(CAND_LIST[CHOICE])-6))/20)}")

TOO_CLOSE_PARTY *= 1+(((len(CAND_LIST[CHOICE])-6))/10) # 6 being the standard party list (assumed)
if DEBUG: print(f"DEBUG: new value {TOO_CLOSE_PARTY}")

# merging the too close parties
while len(CAND_LIST[CHOICE]) > 0:

    dists = []
    if x>=len(CAND_LIST[CHOICE]): x =0

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
        print(f"{COUNTRY} \nThe electoral commission has ruled that {CAND_LIST[CHOICE][x].party} and {CAND_LIST[CHOICE][index_min].party} are too politically similar.")

        print(f"{CAND_LIST[CHOICE][x].party} and {CAND_LIST[CHOICE][index_min].party} have formed a coalition.")

        sent1 = CAND_LIST[CHOICE][x].party
        sent2 = CAND_LIST[CHOICE][index_min].party

        nam = input("Enter a name for the merged parties (empty for auto, NO to refuse):\n").strip()
        if nam == "NO": pass
        else:
            if nam == "":
                nam = merge_party_names(sent1, sent2)

            CAND_LIST[CHOICE][x].party = nam
            CAND_LIST[CHOICE][x].name = CAND_LIST[CHOICE][x].name + " / " + CAND_LIST[CHOICE][index_min].name
            for v in range(len(CAND_LIST[CHOICE][x].vals)):
                CAND_LIST[CHOICE][x].vals[v] = round((CAND_LIST[CHOICE][x].vals[v]+CAND_LIST[CHOICE][index_min].vals[v]) /2)

            CAND_LIST[CHOICE].pop(index_min)
            print(f"A new party, {nam}, has been formed.")
            input()
            os.system('cls' if os.name == 'nt' else 'clear')


    if x>=len(CAND_LIST[CHOICE]): x =0
    CAND_LIST["CURRENT"].append(CAND_LIST[CHOICE][x])
    CAND_LIST[CHOICE].pop(x)

    x+=1

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
                print(ideo[x] + " government.")

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
    numpy.random.normal(loc = VOTING_DEMOS[COUNTRY]["vals"]["prog_cons"], scale = 50, size=VOTING_DEMOS[COUNTRY]["pop"]), # prog - cons
    numpy.random.normal(loc = VOTING_DEMOS[COUNTRY]["vals"]["nat_glob"], scale = 100, size=VOTING_DEMOS[COUNTRY]["pop"]), # nat - glob
    numpy.random.normal(loc = VOTING_DEMOS[COUNTRY]["vals"]["env_eco"], scale = 150, size=VOTING_DEMOS[COUNTRY]["pop"]), # env - eco
    numpy.random.normal(loc = VOTING_DEMOS[COUNTRY]["vals"]["soc_cap"], scale = 50, size=VOTING_DEMOS[COUNTRY]["pop"]), # soc - cap
    numpy.random.normal(loc = VOTING_DEMOS[COUNTRY]["vals"]["pac_mil"], scale = 120, size=VOTING_DEMOS[COUNTRY]["pop"]), # pac - mil
    numpy.random.normal(loc = VOTING_DEMOS[COUNTRY]["vals"]["auth_ana"], scale = 160, size=VOTING_DEMOS[COUNTRY]["pop"]), # auth - ana
    numpy.random.normal(loc = VOTING_DEMOS[COUNTRY]["vals"]["rel_sec"], scale = 160, size=VOTING_DEMOS[COUNTRY]["pop"]), # rel - sec
]
FACTORS = {
    "prog_cons": 0,
    "nat_glob": 0,
    "env_eco": 0,
    "soc_cap": 0,
    "pac_mil": 0,
    "auth_ana": 0,
    "rel_sec": 0,
}

for x in range(len(data)):
    numpy.random.shuffle(data[x])

try: TIME = float(input("Delay : (0->50) ")) # seconds
except ValueError: TIME = 0

DELAY = (TIME*5)/(math.sqrt(VOTING_DEMOS[COUNTRY]["pop"]))

try: POLL_COUNTER += int(input("Number of polls: (+/- 400): "))
except ValueError: pass


# ~~~~~~~~~~ VOTING SYSTEMS ~~~~~~~~~

os.system('cls' if os.name == 'nt' else 'clear')
MODES = ["FPTP", "RUNOFF", "PROP REP"]
for x in MODES:
    print(x)

mode = difflib.get_close_matches(input("\nWhich voting system do you want to simulate? ").strip().upper(), MODES, 1)[0]
if mode == "RUNOFF":
    r_done = False
    while not r_done:
        r_count = input("\nHow many rounds do you want? ")
        try: r_count = int(r_count); r_done = True
        except: pass

if COUNTRY != CHOICE: # discard party popularity if not the relevant country
    for c in CANDIDATES:
        c.party_pop *= 0.4 # reset popularity by 0.4

def print_parliament(results, leaders):
    mpl.clf()
    mpl.cla()
    mpl.close()

    try: seat_num = int(input("Parliament seats: (400) "))
    except: seat_num = 400

    rows = round(0.6 * math.sqrt(seat_num))
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
            colours.append(f"#{str(hex(random.randrange(0, 150)))[2:].zfill(2)}{str(hex(random.randrange(100, 255)))[2:].zfill(2)}{str(hex(random.randrange(0, 200)))[2:].zfill(2)}") # varying reds
            g_tick += round((255/len(parties)))

    for x in range(len(parties)):
        if parties[x] not in leaders:
            opp_seats.append(x)
            opp.append(parties[x].party)
            #colours.append(f"#{str(hex(random.randrange(0, 2**24)))[2:]}")

            colours.append(f"#{str(hex(random.randrange(100, 255)))[2:].zfill(2)}{str(hex(random.randrange(0, 150)))[2:].zfill(2)}{str(hex(random.randrange(0, 200)))[2:].zfill(2)}") # varying reds
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
        modifier=None,
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
    print(f"\nGovernment: {sum([ha_allocations[x] for x in gov_seats])} seats")
    for x in range(len(gov)):
        if ha_allocations[gov_seats[x]] != 0: print(f"> {gov[x]} ~ {ha_allocations[gov_seats[x]]} seats")
    print(f"\nOpposition: {sum([ha_allocations[x] for x in opp_seats])} seats")
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
    mpl.show()
    mpl.rcParams["figure.figsize"] = [7, 5]
    input("Showing parliament...")



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
results = run(data, CANDIDATES, VOTING_DEMOS[COUNTRY]['pop'])

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
    print_parliament(results, [results[0][0]])

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
            print(f"to form a majority government.")
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
